import {
  assertTrustedWriteRequest,
  enforceConfirmationRateLimit,
  getSupabaseAdmin,
  jsonResponse,
  readJsonBody,
  routeErrorResponse,
  RouteError,
} from "@/lib/server/abuse-protection";
import { validateConfirmationSubmission } from "@/lib/report-model";

export async function POST(request: Request) {
  try {
    assertTrustedWriteRequest(request);
    const validation = validateConfirmationSubmission(
      await readJsonBody(request),
    );
    if (!validation.ok) throw new RouteError(400, validation.message);

    await enforceConfirmationRateLimit(request, validation.value);

    const { data, error } = await getSupabaseAdmin().rpc(
      "confirm_bribe_report",
      { report_id: validation.value },
    );
    if (error) {
      if (error.code === "P0001") {
        throw new RouteError(404, "Report not found or not published.");
      }
      throw error;
    }
    if (!Number.isSafeInteger(data) || data < 0) {
      throw new Error("The confirmation function returned an invalid result.");
    }

    return jsonResponse({ confirmationCount: data });
  } catch (error) {
    return routeErrorResponse(error, "Protected report confirmation failed");
  }
}
