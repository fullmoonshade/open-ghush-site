import type {
  BribeReportInput,
  ReportPage,
  ReportPageRequest,
  ReportSummary,
} from "@/lib/report-model";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type ConfirmationCountRow = {
  id: string;
  confirmation_count: number;
};

async function getJson(path: string, signal?: AbortSignal): Promise<unknown> {
  const response = await fetch(path, {
    credentials: "same-origin",
    signal,
  });
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }
  if (!response.ok) {
    const errorPayload = payload as ApiErrorPayload | null;
    throw new ApiRequestError(
      typeof errorPayload?.error === "string"
        ? errorPayload.error
        : "The request could not be completed.",
      response.status,
      null,
    );
  }
  return payload;
}

export async function fetchReportPage(
  request: ReportPageRequest,
  signal?: AbortSignal,
): Promise<ReportPage> {
  const searchParams = new URLSearchParams({
    offset: String(request.offset),
    limit: String(request.limit),
    sort: request.sort,
  });
  if (request.outcome) searchParams.set("outcome", request.outcome);
  if (request.department) searchParams.set("department", request.department);
  if (request.search) searchParams.set("search", request.search);
  for (const alias of request.aliases ?? []) {
    searchParams.append("alias", alias);
  }

  const payload = (await getJson(
    `/api/reports?${searchParams}`,
    signal,
  )) as ReportPage | null;
  if (!Array.isArray(payload?.reports) || !Number.isSafeInteger(payload.total)) {
    throw new Error("The report page response was invalid.");
  }
  return payload;
}

export async function fetchReportSummary(
  signal?: AbortSignal,
): Promise<ReportSummary> {
  const payload = (await getJson(
    "/api/reports/summary",
    signal,
  )) as ReportSummary | null;
  const totals = payload?.totals;
  const amountBands = payload?.amountBands;
  const numericTotals = totals
    ? [
        totals.count,
        totals.amount,
        totals.minimumAmount,
        totals.maximumAmount,
        totals.underFiveThousandRate,
        totals.refusalRate,
        totals.paidCount,
        totals.refusedCount,
        totals.pendingCount,
        totals.districts,
        totals.spanDays,
      ]
    : [];
  const numericBands = amountBands ? Object.values(amountBands) : [];
  const hasGroupRows =
    Array.isArray(payload?.districtRows) &&
    Array.isArray(payload?.departmentRows);
  const groupRows = hasGroupRows
    ? [...payload.districtRows, ...payload.departmentRows]
    : [];
  if (
    !payload ||
    numericTotals.length !== 11 ||
    numericBands.length !== 4 ||
    ![...numericTotals, ...numericBands].every(
      (value) => Number.isSafeInteger(value) && value >= 0,
    ) ||
    !hasGroupRows ||
    !groupRows.every(
      (row) =>
        typeof row.name === "string" &&
        Number.isSafeInteger(row.reports) &&
        row.reports >= 0 &&
        Number.isSafeInteger(row.amount) &&
        row.amount >= 0,
    )
  ) {
    throw new Error("The report summary response was invalid.");
  }
  return payload;
}

export async function fetchConfirmationCounts(
  reportIds: string[],
  signal?: AbortSignal,
): Promise<Record<string, number>> {
  if (!supabaseUrl || !supabasePublishableKey) {
    throw new Error("Supabase environment variables are required.");
  }
  const ids = reportIds
    .filter((id) => UUID_PATTERN.test(id))
    .slice(0, 20);
  if (!ids.length) return {};

  const searchParams = new URLSearchParams({
    select: "id,confirmation_count",
    is_published: "eq.true",
    id: `in.(${ids.join(",")})`,
  });
  const response = await fetch(
    `${supabaseUrl}/rest/v1/bribe_reports?${searchParams}`,
    {
      headers: { apikey: supabasePublishableKey },
      cache: "no-store",
      signal,
    },
  );
  if (!response.ok) {
    throw new Error("Confirmation counts could not be refreshed.");
  }

  const rows = (await response.json()) as ConfirmationCountRow[];
  const counts: Record<string, number> = {};
  for (const row of rows) {
    if (
      UUID_PATTERN.test(row.id) &&
      Number.isSafeInteger(row.confirmation_count) &&
      row.confirmation_count >= 0
    ) {
      counts[row.id] = row.confirmation_count;
    }
  }
  return counts;
}

export class ApiRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly retryAfter: number | null,
  ) {
    super(message);
  }
}

type ApiErrorPayload = {
  error?: unknown;
};

type ConfirmationPayload = {
  confirmationCount?: unknown;
};

async function postJson(path: string, body: unknown): Promise<unknown> {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
    credentials: "same-origin",
  });

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const errorPayload = payload as ApiErrorPayload | null;
    const message =
      typeof errorPayload?.error === "string"
        ? errorPayload.error
        : "The request could not be completed.";
    const retryAfterValue = Number(response.headers.get("retry-after"));
    throw new ApiRequestError(
      message,
      response.status,
      Number.isSafeInteger(retryAfterValue) && retryAfterValue > 0
        ? retryAfterValue
        : null,
    );
  }

  return payload;
}

export async function createReport(
  input: BribeReportInput,
  elapsedMs: number,
  website: string,
): Promise<void> {
  await postJson("/api/reports", { ...input, elapsedMs, website });
}

export async function confirmReport(reportId: string): Promise<number> {
  const payload = (await postJson("/api/reports/confirm", {
    reportId,
  })) as ConfirmationPayload | null;
  if (
    typeof payload?.confirmationCount !== "number" ||
    !Number.isSafeInteger(payload.confirmationCount) ||
    payload.confirmationCount < 0
  ) {
    throw new Error("The confirmation response was invalid.");
  }
  return payload.confirmationCount;
}
