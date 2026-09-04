import { routeErrorResponse } from "@/lib/server/abuse-protection";
import { getReportSummary } from "@/lib/server/report-queries";

export async function GET() {
  try {
    const summary = await getReportSummary();
    return Response.json(summary, {
      headers: {
        "Cache-Control":
          "public, max-age=60, s-maxage=300, stale-while-revalidate=3600",
        "Vercel-CDN-Cache-Control":
          "public, s-maxage=300, stale-while-revalidate=3600",
      },
    });
  } catch (error) {
    return routeErrorResponse(error, "Public report summary failed");
  }
}
