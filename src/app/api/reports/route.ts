import {
  assertTrustedWriteRequest,
  enforceReportRateLimit,
  getSupabaseAdmin,
  jsonResponse,
  readJsonBody,
  routeErrorResponse,
  RouteError,
} from "@/lib/server/abuse-protection";
import {
  departments,
  divisions,
  reportOutcomes,
  reportSorts,
  type ReportOutcome,
  type ReportSort,
  validateReportSubmission,
} from "@/lib/report-model";
import { listReports } from "@/lib/server/report-queries";


export async function GET(request: Request) {
  try {
    const searchParams = new URL(request.url).searchParams;
    const outcomeValue = searchParams.get("outcome");
    const departmentValue = searchParams.get("department");
    const sortValue = searchParams.get("sort");
    const requestedOffset = Number(searchParams.get("offset"));
    const requestedLimit = Number(searchParams.get("limit"));
    const offset =
      Number.isSafeInteger(requestedOffset) && requestedOffset >= 0
        ? Math.min(requestedOffset, 100_000)
        : 0;
    const limit =
      Number.isSafeInteger(requestedLimit) && requestedLimit > 0
        ? Math.min(requestedLimit, 20)
        : 5;
    const aliases = searchParams
      .getAll("alias")
      .filter((value) =>
        [...departments, ...divisions].includes(
          value as (typeof departments)[number] | (typeof divisions)[number],
        ),
      )
      .slice(0, departments.length + divisions.length);

    const page = await listReports({
      offset,
      limit,
      outcome: reportOutcomes.includes(outcomeValue as ReportOutcome)
        ? (outcomeValue as ReportOutcome)
        : undefined,
      department: departments.includes(
        departmentValue as (typeof departments)[number],
      )
        ? departmentValue ?? undefined
        : undefined,
      search: searchParams.get("search") ?? undefined,
      aliases,
      sort: reportSorts.includes(sortValue as ReportSort)
        ? (sortValue as ReportSort)
        : "newest",
    });

    return Response.json(page, {
      headers: {
        "Cache-Control":
          "public, max-age=15, s-maxage=60, stale-while-revalidate=300",
        "Vercel-CDN-Cache-Control":
          "public, s-maxage=60, stale-while-revalidate=300",
      },
    });
  } catch (error) {
    return routeErrorResponse(error, "Public report read failed");
  }
}

export async function POST(request: Request) {
  try {
    assertTrustedWriteRequest(request);
    const validation = validateReportSubmission(await readJsonBody(request));
    if (!validation.ok) throw new RouteError(400, validation.message);

    await enforceReportRateLimit(request);

    const { error } = await getSupabaseAdmin().from("bribe_reports").insert({
      ...validation.value,
      confirmation_count: 0,
      is_published: false,
      is_sample: false,
      review_status: "pending",
    });
    if (error) throw error;

    return jsonResponse({ accepted: true }, 202);
  } catch (error) {
    return routeErrorResponse(error, "Protected report submission failed");
  }
}
