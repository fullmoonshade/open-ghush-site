import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  departments,
  divisions,
  type BribeReport,
  type ReportPage,
  type ReportPageRequest,
  type ReportSummary,
} from "@/lib/report-model";

// Public API responses round created_at down to the start of the hour.
// A raw microsecond-precision timestamp on a public bribe report lets an
// adversary correlate a specific submission against CCTV footage or a
// visitor logbook at the named office - the exact deanonymization channel
// a targeted official would use. Sorting, hot-score decay, the flood-guard
// trigger's 6h dedup window, and span-day calculations all continue to use
// the full-precision value from the database; only what gets serialized
// to the client is coarsened.
function roundToHour(isoTimestamp: string): string {
  const date = new Date(isoTimestamp);
  date.setUTCMinutes(0, 0, 0);
  return date.toISOString();
}

function withRoundedTimestamp<T extends { created_at: string }>(report: T): T {
  return { ...report, created_at: roundToHour(report.created_at) };
}

const PUBLIC_REPORT_COLUMNS =
  "id, created_at, department, service, city, district, amount, outcome, description, confirmation_count";
const HOT_REPORT_RPC = "list_hot_reports";

let publicClient: SupabaseClient | null = null;

type HotReportRow = BribeReport & { total_count: number };
type SummaryGroupRow = ReportSummary["districtRows"][number];

function normalizeSummaryGroups(
  rows: SummaryGroupRow[],
  knownValues: readonly string[],
): ReportSummary["districtRows"] {
  const grouped = Object.create(null) as Record<
    string,
    { reports: number; amount: number }
  >;
  for (const name of knownValues) {
    grouped[name] = { reports: 0, amount: 0 };
  }
  for (const row of rows) {
    grouped[row.name] = { reports: row.reports, amount: row.amount };
  }
  return Object.entries(grouped)
    .map(([name, values]) => ({ name, ...values }))
    .sort((a, b) => b.reports - a.reports || b.amount - a.amount);
}

function requiredEnvironmentVariable(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required for public report reads.`);
  return value;
}

function getPublicClient(): SupabaseClient {
  if (!publicClient) {
    publicClient = createClient(
      requiredEnvironmentVariable("NEXT_PUBLIC_SUPABASE_URL"),
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
        requiredEnvironmentVariable("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
  }
  return publicClient;
}

function normalizeSearch(value: string | undefined): string {
  return (value ?? "")
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

function buildSearchFilter(options: ReportPageRequest): string {
  const conditions: string[] = [];
  const search = normalizeSearch(options.search);
  if (search) {
    conditions.push(
      `department.ilike.%${search}%`,
      `service.ilike.%${search}%`,
      `city.ilike.%${search}%`,
      `district.ilike.%${search}%`,
    );
  }
  for (const alias of options.aliases ?? []) {
    conditions.push(`department.eq.${alias}`, `district.eq.${alias}`);
  }
  return conditions.join(",");
}

function createFilteredQuery<const Columns extends string>(
  columns: Columns,
  options: ReportPageRequest,
  exactCount = false,
) {
  let query = getPublicClient()
    .from("bribe_reports")
    .select(columns, exactCount ? { count: "exact" } : {})
    .eq("is_published", true);

  if (options.outcome) query = query.eq("outcome", options.outcome);
  if (options.department) query = query.eq("department", options.department);
  const searchFilter = buildSearchFilter(options);
  if (searchFilter) query = query.or(searchFilter);
  return query;
}

async function listHotReports(options: ReportPageRequest): Promise<ReportPage> {
  const { data, error } = await getPublicClient().rpc(HOT_REPORT_RPC, {
    p_offset: options.offset,
    p_limit: options.limit,
    p_outcome: options.outcome ?? null,
    p_department: options.department ?? null,
    p_search: normalizeSearch(options.search) || null,
    p_aliases: options.aliases ?? [],
  });
  if (error) throw error;

  const rows = (data ?? []) as HotReportRow[];
  const total = rows.length ? Number(rows[0].total_count) : 0;
  if (!Number.isSafeInteger(total) || total < 0) {
    throw new Error("The hot report function returned an invalid count.");
  }

  return {
    reports: rows.map((row) =>
      withRoundedTimestamp({
        id: row.id,
        created_at: row.created_at,
        department: row.department,
        service: row.service,
        city: row.city,
        district: row.district,
        amount: row.amount,
        outcome: row.outcome,
        description: row.description,
        confirmation_count: row.confirmation_count,
      }),
    ),
    total,
  };
}

export async function listReports(options: ReportPageRequest): Promise<ReportPage> {
  if (options.sort === "hot") return listHotReports(options);

  let query = createFilteredQuery(PUBLIC_REPORT_COLUMNS, options, true);
  if (options.sort === "amount") {
    query = query
      .order("amount", { ascending: false })
      .order("created_at", { ascending: false });
  } else if (options.sort === "confirmed") {
    query = query
      .order("confirmation_count", { ascending: false })
      .order("created_at", { ascending: false });
  } else {
    query = query.order("created_at", { ascending: false });
  }

  const { data, error, count } = await query.range(
    options.offset,
    options.offset + options.limit - 1,
  );
  if (error) throw error;
  return {
    reports: ((data ?? []) as BribeReport[]).map(withRoundedTimestamp),
    total: count ?? 0,
  };
}
export async function getReportSummary(): Promise<ReportSummary> {
  const { data, error } = await getPublicClient().rpc(
    "get_public_report_summary",
  );
  if (error) throw error;

  const summary = data as ReportSummary | null;
  if (
    !summary ||
    !Number.isSafeInteger(summary.totals?.count) ||
    !Array.isArray(summary.districtRows) ||
    !Array.isArray(summary.departmentRows)
  ) {
    throw new Error("The public report summary RPC returned invalid data.");
  }

  return {
    ...summary,
    districtRows: normalizeSummaryGroups(summary.districtRows, divisions),
    departmentRows: normalizeSummaryGroups(summary.departmentRows, departments),
    latestReport: summary.latestReport
      ? {
          ...summary.latestReport,
          created_at: roundToHour(summary.latestReport.created_at),
        }
      : null,
  };
}

