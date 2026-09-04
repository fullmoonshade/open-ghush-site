import "server-only";

import { createHmac } from "node:crypto";
import { ipAddress } from "@vercel/functions";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  isTrustedWriteOrigin,
  safeErrorMetadata,
  selectClientNetworkAddress,
} from "@/lib/server/request-security";

const MAX_JSON_BODY_BYTES = 4_096;
const KEY_ROTATION_MS = 7 * 24 * 60 * 60 * 1_000;

let adminClient: SupabaseClient | null = null;

export class RouteError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly retryAfter?: number,
  ) {
    super(message);
  }
}

function requiredEnvironmentVariable(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required for protected writes.`);
  }
  return value;
}

export function getSupabaseAdmin() {
  if (!adminClient) {
    adminClient = createClient(
      requiredEnvironmentVariable("NEXT_PUBLIC_SUPABASE_URL"),
      requiredEnvironmentVariable("SUPABASE_SERVICE_ROLE_KEY"),
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
  }
  return adminClient;
}

export function assertTrustedWriteRequest(request: Request): void {
  if (!isTrustedWriteOrigin(request, process.env.APP_ORIGIN)) {
    throw new RouteError(403, "Cross-site submissions are not allowed.");
  }
  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.startsWith("application/json")) {
    throw new RouteError(415, "The request must use JSON.");
  }
}

export async function readJsonBody(request: Request): Promise<unknown> {
  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(declaredLength) && declaredLength > MAX_JSON_BODY_BYTES) {
    throw new RouteError(413, "The request body is too large.");
  }

  const bytes = await request.arrayBuffer();
  if (bytes.byteLength > MAX_JSON_BODY_BYTES) {
    throw new RouteError(413, "The request body is too large.");
  }

  try {
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new RouteError(400, "The request body is invalid JSON.");
  }
}

function rotatingAbuseKey(request: Request, discriminator = ""): string {
  const secret = requiredEnvironmentVariable("RATE_LIMIT_HMAC_SECRET");
  if (secret.length < 32) {
    throw new Error("RATE_LIMIT_HMAC_SECRET must contain at least 32 characters.");
  }

  const networkAddress = selectClientNetworkAddress(
    request,
    process.env.VERCEL ? ipAddress(request) : undefined,
    process.env.TRUSTED_CLIENT_IP_HEADER,
  );
  if (!networkAddress) {
    throw new RouteError(
      503,
      "Anonymous submissions are unavailable until rate limiting is configured.",
    );
  }

  const rotation = Math.floor(Date.now() / KEY_ROTATION_MS);
  return createHmac("sha256", secret)
    .update(`${rotation}\0${networkAddress}\0${discriminator}`)
    .digest("hex");
}

async function consumeRateLimit(
  scope: string,
  keyHash: string,
  windowSeconds: number,
  maximumRequests: number,
): Promise<void> {
  const { data, error } = await getSupabaseAdmin().rpc(
    "consume_abuse_rate_limit",
    {
      p_scope: scope,
      p_key_hash: keyHash,
      p_window_seconds: windowSeconds,
      p_max_requests: maximumRequests,
    },
  );

  if (error) throw error;

  const retryAfter = Number(data);
  if (!Number.isSafeInteger(retryAfter) || retryAfter < 0) {
    throw new Error("The rate-limit function returned an invalid result.");
  }
  if (retryAfter > 0) {
    throw new RouteError(
      429,
      "Too many requests. Please wait before trying again.",
      retryAfter,
    );
  }
}

export async function enforceReportRateLimit(request: Request): Promise<void> {
  const keyHash = rotatingAbuseKey(request);
  await consumeRateLimit("report-hour", keyHash, 60 * 60, 5);
  await consumeRateLimit("report-day", keyHash, 24 * 60 * 60, 15);
}

export async function enforceConfirmationRateLimit(
  request: Request,
  reportId: string,
): Promise<void> {
  await consumeRateLimit(
    "confirmation-hour",
    rotatingAbuseKey(request),
    60 * 60,
    60,
  );
  // Was 7 days: a shared-IP population (CGNAT is common on Bangladeshi
  // mobile/ISP networks) could get locked out of confirming a specific
  // report for up to a week over one other person's action on that same
  // address. 24h keeps meaningful friction against trivially inflating a
  // report's public confirmation_count from one source, while bounding
  // collateral damage to shared-IP users to at most a day.
  await consumeRateLimit(
    "confirmation-report-day",
    rotatingAbuseKey(request, reportId),
    24 * 60 * 60,
    1,
  );
}

export function jsonResponse(body: unknown, status = 200, retryAfter?: number) {
  const headers = new Headers({
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
  });
  if (retryAfter) headers.set("Retry-After", String(retryAfter));
  return new Response(JSON.stringify(body), { status, headers });
}

export function routeErrorResponse(error: unknown, context: string): Response {
  if (error instanceof RouteError) {
    return jsonResponse(
      { error: error.message },
      error.status,
      error.retryAfter,
    );
  }

  // Database errors may contain the rejected row in message/details/hint.
  // Log only non-content metadata for confidential write failures.
  console.error(context, safeErrorMetadata(error));
  return jsonResponse({ error: "The request could not be completed." }, 500);
}
