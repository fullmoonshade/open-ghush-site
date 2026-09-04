"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  type BribeReport,
  type BribeReportInput,
  type ReportOutcome,
  type ReportSort,
  type ReportSummary,
  departments,
  divisions,
} from "@/lib/report-model";
import {
  ApiRequestError,
  confirmReport,
  createReport,
  fetchConfirmationCounts,
  fetchReportPage,
  fetchReportSummary,
} from "@/lib/reports";
import { SupportBanner } from "@/components/support-banner";
import { SupportPage } from "@/components/support-page";
import { optionalHttpsUrl } from "@/lib/public-config";
import { Language, LanguageProvider, localizeDigits, translate, useLanguage } from "@/lib/language";

type PageMode = "home" | "report" | "privacy" | "team" | "support";
type ViewMode = "cards" | "table";
type SortMode = ReportSort;

const REPORTS_PAGE_SIZE = 5;
const FEATURE_REQUEST_URL = optionalHttpsUrl(
  process.env.NEXT_PUBLIC_FEATURE_REQUEST_URL,
);
const PRESS_URL = optionalHttpsUrl(process.env.NEXT_PUBLIC_PRESS_URL);

const EMPTY_TOTALS: ReportSummary["totals"] = {
  count: 0,
  amount: 0,
  minimumAmount: 0,
  maximumAmount: 0,
  underFiveThousandRate: 0,
  refusalRate: 0,
  paidCount: 0,
  refusedCount: 0,
  pendingCount: 0,
  districts: 0,
  spanDays: 0,
};

const EMPTY_DISTRICT_ROWS: ReportSummary["districtRows"] = divisions.map(
  (name) => ({ name, reports: 0, amount: 0 }),
);

const EMPTY_DEPARTMENT_ROWS: ReportSummary["departmentRows"] = departments.map(
  (name) => ({ name, reports: 0, amount: 0 }),
);

const EMPTY_AMOUNT_BANDS: ReportSummary["amountBands"] = {
  upTo1000: 0,
  from1001To5000: 0,
  from5001To10000: 0,
  above10000: 0,
};

function formatMoney(amount: number, language: Language) {
  const digits = String(Math.round(Math.abs(amount)));
  const lastThree = digits.slice(-3);
  const rest = digits.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ",");
  const grouped = rest ? `${rest},${lastThree}` : lastThree;
  return localizeDigits(`${amount < 0 ? "-" : ""}৳${grouped}`, language);
}

function formatCompactMoney(amount: number, language: Language) {
  if (amount < 100000) return formatMoney(amount, language);
  const inCrore = amount >= 10000000;
  const value = Math.round((amount / (inCrore ? 10000000 : 100000)) * 100) / 100;
  const unit = inCrore
    ? language === "bn" ? "কোটি" : "crore"
    : language === "bn" ? "লাখ" : "lakh";
  return localizeDigits(`৳${value} ${unit}`, language);
}

function relativeDate(value: string, language: Language) {
  const seconds = Math.max(1, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (language === "bn") {
    const label = seconds < 3600
      ? `${Math.floor(seconds / 60) || 1} মিনিট আগে`
      : seconds < 86400
        ? `${Math.floor(seconds / 3600)} ঘণ্টা আগে`
        : `${Math.floor(seconds / 86400)} দিন আগে`;
    return localizeDigits(label, language);
  }
  if (seconds < 3600) return `${Math.floor(seconds / 60) || 1} minutes ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  return `${Math.floor(seconds / 86400)} days ago`;
}

function formatDuration(days: number, language: Language) {
  if (days < 1) return language === "bn" ? "আজ" : "today";
  if (language === "bn") {
    let label: string;
    if (days < 30) label = `${days} দিনে`;
    else if (days < 365) label = `${Math.floor(days / 30)} মাসে`;
    else {
      const years = Math.floor(days / 365);
      const months = Math.floor((days % 365) / 30);
      label = months ? `${years} বছর ${months} মাসে` : `${years} বছরে`;
    }
    return localizeDigits(label, language);
  }
  if (days < 30) return `in ${days} day${days === 1 ? "" : "s"}`;
  if (days < 365) {
    const months = Math.floor(days / 30);
    return `in ${months} month${months === 1 ? "" : "s"}`;
  }
  const years = Math.floor(days / 365);
  const months = Math.floor((days % 365) / 30);
  return months
    ? `in ${years} year${years === 1 ? "" : "s"}, ${months} month${months === 1 ? "" : "s"}`
    : `in ${years} year${years === 1 ? "" : "s"}`;
}

function outcomeLabel(outcome: BribeReport["outcome"]) {
  return outcome === "paid" ? "Paid" : outcome === "refused" ? "Refused" : "Demand pending";
}

function Brand({ onClick }: { onClick?: () => void }) {
  return (
    <button
      className="brand"
      type="button"
      onClick={onClick ?? (() => window.scrollTo({ top: 0, behavior: "smooth" }))}
    >
      Ghush<span>Site</span><sup>ঘুষ</sup>
    </button>
  );
}

export default function GhushSite() {
  return (
    <LanguageProvider>
      <GhushSiteApp />
    </LanguageProvider>
  );
}

function GhushSiteApp() {
  const { t, language, toggleLanguage } = useLanguage();
  const [mode, setMode] = useState<PageMode>("home");
  const [reports, setReports] = useState<BribeReport[]>([]);
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [totalReports, setTotalReports] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [summaryError, setSummaryError] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [outcome, setOutcome] = useState<"all" | ReportOutcome>("all");
  const [department, setDepartment] = useState("all");
  const [sort, setSort] = useState<SortMode>("newest");
  const [view, setView] = useState<ViewMode>("cards");
  const [query, setQuery] = useState("");
  const [deferredQuery, setDeferredQuery] = useState("");
  const [openFaq, setOpenFaq] = useState(0);
  const [confirmedReportIds, setConfirmedReportIds] = useState<string[]>([]);
  const [votingReportId, setVotingReportId] = useState<string | null>(null);
  const [voteErrorId, setVoteErrorId] = useState<string | null>(null);
  const activeQueryKeyRef = useRef("");
  const refreshedConfirmationIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const controller = new AbortController();
    fetchReportSummary(controller.signal)
      .then(setSummary)
      .catch(() => {
        if (!controller.signal.aborted) {
          setSummaryError("Live data is unavailable. Please try again shortly.");
        }
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const saved = window.localStorage.getItem("ghushsite-confirmed-reports");
    let reportIds: string[] = [];
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) reportIds = parsed.filter((value) => typeof value === "string");
      } catch {
        window.localStorage.removeItem("ghushsite-confirmed-reports");
      }
    }
    const frame = window.requestAnimationFrame(() => setConfirmedReportIds(reportIds));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDeferredQuery(query), 300);
    return () => window.clearTimeout(timeout);
  }, [query]);

  const searchAliases = useMemo(() => {
    const needle = deferredQuery.trim().toLocaleLowerCase();
    if (!needle || language !== "bn") return [];
    return [...departments, ...divisions].filter((value) => {
      const translated = translate(value, language).toLocaleLowerCase();
      return translated.includes(needle) || needle.includes(translated);
    });
  }, [deferredQuery, language]);

  const reportQuery = useMemo(
    () => ({
      outcome: outcome === "all" ? undefined : outcome,
      department: department === "all" ? undefined : department,
      search: deferredQuery.trim() || undefined,
      aliases: searchAliases,
      sort,
    }),
    [department, deferredQuery, outcome, searchAliases, sort],
  );

  useEffect(() => {
    const controller = new AbortController();
    const queryKey = JSON.stringify(reportQuery);
    activeQueryKeyRef.current = queryKey;
    queueMicrotask(() => {
      if (
        controller.signal.aborted ||
        activeQueryKeyRef.current !== queryKey
      ) {
        return;
      }
      setLoading(true);
      setLoadError("");
      setReports([]);
    });

    refreshedConfirmationIdsRef.current.clear();
    fetchReportPage(
      {
        ...reportQuery,
        offset: 0,
        limit: REPORTS_PAGE_SIZE,
      },
      controller.signal,
    )
      .then((page) => {
        if (activeQueryKeyRef.current !== queryKey) return;
        setReports(page.reports);
        setTotalReports(page.total);
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setLoadError("Live data is unavailable. Please try again shortly.");
        }
      })
      .finally(() => {
        if (
          !controller.signal.aborted &&
          activeQueryKeyRef.current === queryKey
        ) {
          setLoading(false);
        }
      });
    return () => controller.abort();
  }, [reportQuery]);

  const loadedReportIds = reports.map((report) => report.id).join(",");
  useEffect(() => {
    const missingIds = loadedReportIds
      .split(",")
      .filter(
        (id) => id && !refreshedConfirmationIdsRef.current.has(id),
      );
    if (!missingIds.length) return;
    missingIds.forEach((id) => refreshedConfirmationIdsRef.current.add(id));

    const controller = new AbortController();
    fetchConfirmationCounts(missingIds, controller.signal)
      .then((counts) => {
        setReports((current) => {
          let changed = false;
          const next = current.map((report) => {
            const confirmationCount = counts[report.id];
            if (
              confirmationCount === undefined ||
              confirmationCount === report.confirmation_count
            ) {
              return report;
            }
            changed = true;
            return { ...report, confirmation_count: confirmationCount };
          });
          return changed ? next : current;
        });
      })
      .catch(() => {
        missingIds.forEach((id) =>
          refreshedConfirmationIdsRef.current.delete(id),
        );
      });
    return () => controller.abort();
  }, [loadedReportIds]);

  const showMode = (next: PageMode) => {
    setMode(next);
    setMobileOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const submitConfirmation = async (reportId: string) => {
    if (confirmedReportIds.includes(reportId) || votingReportId) return;
    const previousCount = reports.find(
      (report) => report.id === reportId,
    )?.confirmation_count;
    if (previousCount === undefined) return;

    setVotingReportId(reportId);
    setVoteErrorId(null);
    setReports((current) =>
      current.map((report) =>
        report.id === reportId
          ? { ...report, confirmation_count: previousCount + 1 }
          : report,
      ),
    );
    try {
      const confirmationCount = await confirmReport(reportId);
      setReports((current) =>
        current.map((report) =>
          report.id === reportId
            ? { ...report, confirmation_count: confirmationCount }
            : report,
        ),
      );
      const nextIds = [...confirmedReportIds, reportId];
      window.localStorage.setItem("ghushsite-confirmed-reports", JSON.stringify(nextIds));
      setConfirmedReportIds(nextIds);
    } catch {
      setReports((current) =>
        current.map((report) =>
          report.id === reportId
            ? { ...report, confirmation_count: previousCount }
            : report,
        ),
      );
      setVoteErrorId(reportId);
    } finally {
      setVotingReportId(null);
    }
  };

  const loadMoreReports = async () => {
    if (loadingMore || reports.length >= totalReports) return;
    const queryKey = activeQueryKeyRef.current;
    setLoadingMore(true);
    try {
      const page = await fetchReportPage({
        ...reportQuery,
        offset: reports.length,
        limit: REPORTS_PAGE_SIZE,
      });
      if (activeQueryKeyRef.current !== queryKey) return;
      setReports((current) => {
        const existingIds = new Set(current.map((report) => report.id));
        return [
          ...current,
          ...page.reports.filter((report) => !existingIds.has(report.id)),
        ];
      });
      setTotalReports(page.total);
    } catch {
      if (activeQueryKeyRef.current === queryKey) {
        setLoadError("Live data is unavailable. Please try again shortly.");
      }
    } finally {
      if (activeQueryKeyRef.current === queryKey) setLoadingMore(false);
    }
  };

  const totals = summary?.totals ?? EMPTY_TOTALS;
  const averageReportedAmount = totals.count
    ? Math.round(totals.amount / totals.count)
    : 0;
  const districtRows = summary?.districtRows ?? EMPTY_DISTRICT_ROWS;
  const departmentRows = summary?.departmentRows ?? EMPTY_DEPARTMENT_ROWS;
  const amountBands = summary?.amountBands ?? EMPTY_AMOUNT_BANDS;
  const amountBandRows = [
    { label: t("৳1,000 or less"), count: amountBands.upTo1000 },
    { label: t("৳1,001–৳5,000"), count: amountBands.from1001To5000 },
    { label: t("৳5,001–৳10,000"), count: amountBands.from5001To10000 },
    { label: t("More than ৳10,000"), count: amountBands.above10000 },
  ];
  const outcomeRows = [
    { label: t("Paid"), count: totals.paidCount, tone: "paid" as const },
    { label: t("Refused"), count: totals.refusedCount, tone: "refused" as const },
    {
      label: t("Demand pending"),
      count: totals.pendingCount,
      tone: "pending" as const,
    },
  ];
  const latestReport = summary?.latestReport ?? null;
  const hasMoreReports = reports.length < totalReports;
  const maxDivisionReports = districtRows[0]?.reports ?? 0;
  const topDivision = maxDivisionReports ? districtRows[0] : null;
  const maxDepartmentReports = departmentRows[0]?.reports ?? 0;
  const currentError = loadError || summaryError;

  return (
    <>
      <div className="vision-strip">
        {t("ANONYMOUS BY DESIGN — NO ACCOUNT · COOKIELESS ANALYTICS · NO RAW IP STORED")}
      </div>
      <header className="site-header">
        <div className="header-inner">
          <Brand onClick={() => showMode("home")} />
          <nav className={mobileOpen ? "nav nav-open" : "nav"} aria-label={t("Main navigation")}>
            <button onClick={() => showMode("home")}>{t("REPORTS")}</button>
            <button onClick={() => { showMode("home"); setTimeout(() => document.querySelector("#ledger")?.scrollIntoView({ behavior: "smooth" }), 50); }}>{t("DATA")}</button>
            <button onClick={() => showMode("privacy")}>{t("PRIVACY")}</button>
            <button onClick={() => showMode("team")}>{t("MEET THE TEAM")}</button>
            {FEATURE_REQUEST_URL ? (
              <a
                className="nav-feature-link"
                href={FEATURE_REQUEST_URL}
                target="_blank"
                rel="noopener noreferrer"
              >
                {t("FEATURE REQUEST")}
              </a>
            ) : null}
            <button type="button" className="nav-support-link" onClick={() => showMode("support")}>
              {t("SUPPORT")}
            </button>
            <button type="button" className="nav-lang-toggle" onClick={toggleLanguage} aria-label={t("Switch language")}>
              {language === "en" ? "বাংলা" : "EN"}
            </button>
          </nav>
          <button className="menu-button" type="button" aria-label={t("Toggle navigation")} onClick={() => setMobileOpen((value) => !value)}>
            {mobileOpen ? "×" : "☰"}
          </button>
          <button
            className="button button-dark header-cta"
            type="button"
            aria-label={t("REPORT A BRIBE →")}
            onClick={() => showMode("report")}
          >
            <span className="header-cta-full">{t("REPORT A BRIBE →")}</span>
            <span className="header-cta-short">{t("REPORT")}</span>
          </button>
        </div>
      </header>

      {mode === "report" ? (
        <ReportForm onBack={() => showMode("home")} />
      ) : mode === "privacy" ? (
        <PrivacyPage onBack={() => showMode("home")} />
      ) : mode === "team" ? (
        <TeamPage onBack={() => showMode("home")} onSupport={() => showMode("support")} />
      ) : mode === "support" ? (
        <SupportPage onBack={() => showMode("home")} />
      ) : (
        <main>
          <section className="hero shell">
            <div className="eyebrow">
              <span><i className="live-dot" />{t("LIVE PUBLIC LEDGER")}</span>
              <span>{localizeDigits(totals.count, language)}{t(" REPORTS")}</span>
              <span>{localizeDigits(totals.districts, language)}{t(" DIVISIONS")}</span>
            </div>
            <h1>
              {t("Someone asked")} <mark>{t("for extra.")}</mark><br />
              {t("You remember")} <mark>{t("how much.")}</mark><br />
              {t("Put it")} <mark>{t("on the record.")}</mark>
            </h1>
            <div className="hero-actions">
              <button className="button button-dark" type="button" onClick={() => showMode("report")}>
                {t("Report a bribe →")}
              </button>
              <button className="button button-outline" type="button" onClick={() => document.querySelector("#reports")?.scrollIntoView({ behavior: "smooth" })}>
                {t("Browse reports")}
              </button>
            </div>

            <div className="snapshot-grid">
              <article>
                <span className="micro-label">{t("LATEST REPORT")}</span>
                {latestReport ? (
                  <>
                    <b className="highlight-label">{t(outcomeLabel(latestReport.outcome))}</b>
                    <strong>{t(latestReport.department)}</strong>
                    <small>{latestReport.city} · {relativeDate(latestReport.created_at, language)}</small>
                  </>
                ) : <strong>{t("No reports yet")}</strong>}
              </article>
              <article>
                <span className="micro-label">{t("TOTAL AMOUNT REPORTED")}</span>
                <strong className="snapshot-number">
                  <span className="stat-highlight stat-highlight-amount">{formatCompactMoney(totals.amount, language)}</span>
                  {totals.spanDays > 0 ? (
                    <span className="stat-duration">{formatDuration(totals.spanDays, language)}</span>
                  ) : null}
                </strong>
                <small>{localizeDigits(totals.refusalRate, language)}{t("% of resolved demands refused")}</small>
              </article>
              <article>
                <span className="micro-label">{t("TOP DIVISIONS")}</span>
                <div className="mini-bars">
                  {districtRows.slice(0, 3).map((row) => (
                    <div key={row.name}><span>{t(row.name)}</span><i style={{ width: `${Math.max(16, (row.reports / Math.max(districtRows[0]?.reports ?? 1, 1)) * 100)}%` }} /><b>{localizeDigits(row.reports, language)}</b></div>
                  ))}
                </div>
              </article>
            </div>

            <div className="cluster-banner">
              <div><strong>{t("Patterns become harder to ignore.")}</strong><span>{t("One story is an allegation. Many records reveal a system.")}</span></div>
              <button type="button" onClick={() => document.querySelector("#how-it-works")?.scrollIntoView({ behavior: "smooth" })}>{t("HOW IT WORKS →")}</button>
            </div>
          </section>

          <section id="reports" className="reports-section shell">
            <div className="section-heading">
              <h2>{t("Live")} <em>{t("reports.")}</em></h2>
              <p><span className="live-dot" /> {t("Every entry is an unverified, crowdsourced allegation.")}</p>
            </div>

            <div className="report-layout">
              <div className="report-main">
                <div className="filters" aria-label={t("Report filters")}>
                  <div className="filter-row">
                    {(["all", "paid", "refused", "pending"] as const).map((value) => (
                      <button key={value} type="button" className={outcome === value ? "active" : ""} onClick={() => setOutcome(value)}>
                        {value === "all" ? t("ALL OUTCOMES") : t(outcomeLabel(value))}
                      </button>
                    ))}
                  </div>
                  <div className="filter-tools">
                    <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("Search service or place")} aria-label={t("Search reports")} />
                    <select value={department} onChange={(event) => setDepartment(event.target.value)} aria-label={t("Filter by department")}>
                      <option value="all">{t("ALL DEPARTMENTS")}</option>
                      {departments.map((value) => <option key={value} value={value}>{t(value)}</option>)}
                    </select>
                    <select value={sort} onChange={(event) => setSort(event.target.value as SortMode)} aria-label={t("Sort reports")}>
                      <option value="hot">{t("HOT")}</option>
                      <option value="confirmed">{t("MOST CONFIRMED")}</option>
                      <option value="newest">{t("NEWEST")}</option>
                      <option value="amount">{t("HIGHEST AMOUNT")}</option>
                    </select>
                    <div className="view-switch"><button type="button" className={view === "cards" ? "active" : ""} onClick={() => setView("cards")}>{t("CARDS")}</button><button type="button" className={view === "table" ? "active" : ""} onClick={() => setView("table")}>{t("TABLE")}</button></div>
                  </div>
                </div>
                <p className="result-count">
                  {loading
                    ? t("Loading ledger…")
                    : language === "bn"
                      ? localizeDigits(`মোট ${totalReports}টির মধ্যে ${reports.length}টি রিপোর্ট দেখানো হচ্ছে`, language)
                      : `Showing ${reports.length} of ${totalReports} reports`}
                </p>
                {currentError ? <p className="notice notice-error">{t(currentError)}</p> : null}
                {view === "cards" ? (
                  <div className="report-grid">
                    {reports.map((report, position) => (
                      <ReportCard
                        key={report.id}
                        report={report}
                        rank={position + 1}
                        confirmed={confirmedReportIds.includes(report.id)}
                        voting={votingReportId === report.id}
                        voteFailed={voteErrorId === report.id}
                        onConfirm={submitConfirmation}
                      />
                    ))}
                  </div>
                ) : (
                  <ReportTable reports={reports} />
                )}
                {hasMoreReports ? (
                  <div className="load-more-row">
                    <button
                      type="button"
                      className="load-more-button"
                      disabled={loadingMore}
                      onClick={loadMoreReports}
                    >
                      {loadingMore
                        ? t("Loading ledger…")
                        : language === "bn"
                          ? localizeDigits(`আরও ৫টি লোড করুন (${totalReports - reports.length}টি বাকি) ↓`, language)
                          : `LOAD 5 MORE (${totalReports - reports.length} remaining) ↓`}
                    </button>
                  </div>
                ) : null}
                {!loading && !reports.length ? <div className="empty-state">{t("No reports match these filters.")}</div> : null}
              </div>

              <aside className="leaderboard">
                <div className="aside-title">{t("DIVISION LEDGER")}</div>
                {districtRows.map((row, index) => (
                  <button key={row.name} type="button" onClick={() => setQuery(row.name)}>
                    <span>{localizeDigits(String(index + 1).padStart(2, "0"), language)} · {t(row.name)}</span><b>{localizeDigits(row.reports, language)}</b>
                  </button>
                ))}
                <div className="aside-title aside-title-spaced">{t("AVERAGE REPORTED DEMAND")}</div>
                <div className="big-aside-stat">
                  {totals.count ? formatCompactMoney(averageReportedAmount, language) : "—"}
                  <small>{t("Total reported amount divided by published reports.")}</small>
                </div>
              </aside>
            </div>
          </section>

          <section id="ledger" className="data-section">
            <div className="shell">
              <div className="section-heading split-heading">
                <h2>{t("Transparency")} <em>{t("ledger.")}</em></h2>
                <p>{t("See the range, distribution, outcomes, and reporting hotspots without letting one unusually large demand define the story.")}</p>
              </div>
              <div className="ledger-summary">
                <article>
                  <span>{t("PUBLIC REPORTS")}</span>
                  <strong>{localizeDigits(totals.count, language)}</strong>
                </article>
                <article>
                  <span>{t("DIVISIONS ON LEDGER")}</span>
                  <strong>{localizeDigits(String(totals.districts).padStart(2, "0"), language)}</strong>
                </article>
                <article>
                  <span>{t("LARGEST REPORTED DEMAND")}</span>
                  <strong>{totals.count ? formatCompactMoney(totals.maximumAmount, language) : "—"}</strong>
                </article>
                <article>
                  <span>{t("AVERAGE REPORTED DEMAND")}</span>
                  <strong>{totals.count ? formatCompactMoney(averageReportedAmount, language) : "—"}</strong>
                </article>
                <article>
                  <span>{t("MOST REPORTED DIVISION")}</span>
                  <strong>{topDivision ? t(topDivision.name) : "—"}</strong>
                </article>
              </div>
              <div className="data-reading">
                <div>
                  <span>{t("HOW TO READ THIS DATA")}</span>
                  <h3>{t("A distribution tells more than an average.")}</h3>
                </div>
                <p>{t("A few very large demands can pull an average upward. The bands below show how many reports fall into each practical price range, while the maximum marks the outer edge.")}</p>
              </div>
              <div className="distribution-grid">
                <article className="distribution-card">
                  <header>
                    <div><span>{t("AMOUNT DISTRIBUTION")}</span><h3>{t("How large were the reported demands?")}</h3></div>
                    <small>{t("Count and share of all reports")}</small>
                  </header>
                  <div className="distribution-list">
                    {amountBandRows.map((row) => (
                      <DistributionRow key={row.label} {...row} total={totals.count} />
                    ))}
                  </div>
                </article>
                <article className="distribution-card">
                  <header>
                    <div><span>{t("REPORTED OUTCOMES")}</span><h3>{t("What did people say they did?")}</h3></div>
                    <small>{t("Self-reported, not independently verified")}</small>
                  </header>
                  <div className="distribution-list">
                    {outcomeRows.map((row) => (
                      <DistributionRow key={row.label} {...row} total={totals.count} />
                    ))}
                  </div>
                  <p className="outcome-note">
                    <strong>{localizeDigits(`${totals.refusalRate}%`, language)}</strong>
                    {t(" of resolved reports say the demand was refused. Pending demands are excluded from this rate.")}
                  </p>
                </article>
              </div>
              <div className="registry">
                <div className="registry-head">
                  <span>{t("DEPARTMENT REGISTRY")}</span>
                  <span>{t("SHARE OF REPORTS")}</span>
                </div>
                {departmentRows.map((row, index) => (
                  <button
                    key={row.name}
                    type="button"
                    className={row.reports ? "registry-row" : "registry-row registry-row-empty"}
                    onClick={() => { setDepartment(row.name); document.querySelector("#reports")?.scrollIntoView({ behavior: "smooth" }); }}
                  >
                    <span className="registry-rank">{localizeDigits(String(index + 1).padStart(2, "0"), language)}</span>
                    <span className="registry-name">{t(row.name)}</span>
                    <span className="registry-bar" aria-hidden="true">
                      <i style={{ width: `${maxDepartmentReports ? (row.reports / maxDepartmentReports) * 100 : 0}%` }} />
                    </span>
                    <b>{localizeDigits(row.reports, language)}{t(" reports")}</b>
                    <small>{formatCompactMoney(row.amount, language)}</small>
                  </button>
                ))}
              </div>
              <div className="registry">
                <div className="registry-head">
                  <span>{t("DIVISION REGISTRY")}</span>
                  <span>{t("SHARE OF REPORTS")}</span>
                </div>
                {districtRows.map((row, index) => (
                  <button
                    key={row.name}
                    type="button"
                    className={row.reports ? "registry-row" : "registry-row registry-row-empty"}
                    onClick={() => { setQuery(row.name); document.querySelector("#reports")?.scrollIntoView({ behavior: "smooth" }); }}
                  >
                    <span className="registry-rank">{localizeDigits(String(index + 1).padStart(2, "0"), language)}</span>
                    <span className="registry-name">{t(row.name)}</span>
                    <span className="registry-bar" aria-hidden="true">
                      <i style={{ width: `${maxDivisionReports ? (row.reports / maxDivisionReports) * 100 : 0}%` }} />
                    </span>
                    <b>{localizeDigits(row.reports, language)}{t(" reports")}</b>
                    <small>{formatCompactMoney(row.amount, language)}</small>
                  </button>
                ))}
              </div>
            </div>
          </section>


          <section id="how-it-works" className="how-section shell">
            <div className="section-heading split-heading"><h2>{t("How it works.")} <em>{t("Three steps.")}</em></h2><p>{t("No account. No identity fields. No hidden fingerprint. Just a structured public allegation.")}</p></div>
            <div className="steps">
              <Step number={localizeDigits("01", language)} title={t("ANONYMOUS")} heading={t("Document the demand")}>{t("Choose a department, service, approximate place, amount, and outcome. Do not name an individual.")}</Step>
              <Step number={localizeDigits("02", language)} title={t("REVIEWED")} heading={t("Safety check before publishing")}>{t("Submissions are queued for moderation to remove personal information and obvious abuse.")}</Step>
              <Step number={localizeDigits("03", language)} title={t("PUBLIC")} heading={t("Patterns stay searchable")}>{t("Approved reports become public by division, department, amount, and outcome.")}</Step>
            </div>
          </section>

          <section className="quotes-section">
            <div className="shell quote-inner"><h2>{t("Real services.")} <em>{t("Public patterns.")}</em></h2><p>{t("Allegations are not findings of guilt. GhushSite is an awareness ledger, not an official complaint authority.")}</p><button type="button" onClick={() => showMode("report")}>{t("ADD AN ANONYMOUS REPORT →")}</button></div>
          </section>

          <section className="faq shell">
            <h2>{t("Questions.")}</h2>
            {[
              ["Is my report really anonymous?", "GhushSite asks for no account, name, email, phone number, or device identifier. The report table has no IP-address field. Infrastructure providers may still process network data to deliver the service."],
              ["Can I name the person who demanded money?", "No. Report the department, service, place, amount, and circumstances. Naming an individual creates safety and legal risks and the report may be rejected."],
              ["Is this an official corruption complaint?", "No. GhushSite is a crowdsourced awareness ledger. If you need an investigation or legal remedy, contact the relevant anti-corruption authority."],
            ].map(([question, answer], index) => (
              <div className="faq-item" key={question}>
                <button type="button" onClick={() => setOpenFaq(openFaq === index ? -1 : index)} aria-expanded={openFaq === index}><b>{t(question)}</b><span>{openFaq === index ? "−" : "+"}</span></button>
                {openFaq === index ? <p>{t(answer)}</p> : null}
              </div>
            ))}
          </section>

          <SupportBanner onSupport={() => showMode("support")} />

          <section className="final-cta"><h2>{t("Silence protects the pattern.")}<br />{t("Public data breaks it.")}</h2><p>{t("Takes under two minutes. No identity required.")}</p><button type="button" onClick={() => showMode("report")}>{t("REPORT A BRIBE →")}</button></section>
        </main>
      )}

      <footer><div className="shell"><Brand onClick={() => showMode("home")} /><span>{t("Anonymous public-interest reporting.")}</span>{PRESS_URL ? <a href={PRESS_URL} target="_blank" rel="noopener noreferrer">{t("PRESS")}</a> : null}<button type="button" onClick={() => showMode("team")}>{t("MEET THE TEAM")}</button><button type="button" onClick={() => showMode("privacy")}>{t("PRIVACY & SAFETY")}</button></div></footer>
    </>
  );
}

function ReportCard({
  report,
  rank,
  confirmed,
  voting,
  voteFailed,
  onConfirm,
}: {
  report: BribeReport;
  rank: number;
  confirmed: boolean;
  voting: boolean;
  voteFailed: boolean;
  onConfirm: (reportId: string) => void;
}) {
  const { t, language } = useLanguage();
  return (
    <article className="report-card">
      <div className="card-top"><div className="card-heading"><b className="card-rank">#{localizeDigits(String(rank).padStart(2, "0"), language)}</b><span className="card-department">{t(report.department)}</span></div><strong>{formatMoney(report.amount, language)}</strong></div>
      <div className="card-body">
        <div className="badges"><b className={`outcome outcome-${report.outcome}`}>{t(outcomeLabel(report.outcome))}</b><b>{t("Unverified")}</b></div>
        <h3>{report.service}</h3>
        <p className="card-meta">{report.city}, {t(report.district)} · {report.id.slice(0, 8)}</p>
        <blockquote>“{report.description}”</blockquote>
        <div className="confirmation-row">
          <button
            type="button"
            className="confirm-button"
            disabled={confirmed || voting}
            data-confirmed={confirmed}
            onClick={() => onConfirm(report.id)}
          >
            <span>{voting ? t("SAVING…") : confirmed ? t("✓ CONFIRMED") : t("▲ CONFIRM THIS REPORT")}</span>
            <strong>{localizeDigits(report.confirmation_count, language)}</strong>
          </button>
          <time dateTime={report.created_at}>{relativeDate(report.created_at, language)}</time>
        </div>
        {voteFailed ? <p className="vote-error">{t("Confirmation failed. Please try again.")}</p> : null}
      </div>
    </article>
  );
}

function ReportTable({ reports }: { reports: BribeReport[] }) {
  const { t, language } = useLanguage();
  return (
    <div className="table-wrap"><table><thead><tr><th>{t("DEPARTMENT / SERVICE")}</th><th>{t("PLACE")}</th><th>{t("AMOUNT")}</th><th>{t("OUTCOME")}</th><th>{t("FILED")}</th></tr></thead><tbody>{reports.map((report) => <tr key={report.id}><td><strong>{t(report.department)}</strong><span>{report.service}</span></td><td>{report.city}, {t(report.district)}</td><td>{formatMoney(report.amount, language)}</td><td>{t(outcomeLabel(report.outcome))}</td><td>{relativeDate(report.created_at, language)}</td></tr>)}</tbody></table></div>
  );
}

function DistributionRow({
  label,
  count,
  total,
  tone,
}: {
  label: string;
  count: number;
  total: number;
  tone?: "paid" | "refused" | "pending";
}) {
  const { language } = useLanguage();
  const share = total ? Math.round((count / total) * 100) : 0;
  return (
    <div className={`distribution-row${tone ? ` distribution-row-${tone}` : ""}`}>
      <span>{label}</span>
      <i
        className="distribution-track"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={share}
      >
        <u style={{ width: `${share}%` }} />
      </i>
      <b>{localizeDigits(count, language)}</b>
      <small>{localizeDigits(`${share}%`, language)}</small>
    </div>
  );
}

function Step({ number, title, heading, children }: { number: string; title: string; heading: string; children: React.ReactNode }) {
  return <article><span>{number}</span><b>{title}</b><h3>{heading}</h3><p>{children}</p></article>;
}

function ReportForm({ onBack }: { onBack: () => void }) {
  const { t } = useLanguage();
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [showValidation, setShowValidation] = useState(false);
  const [openedAt, setOpenedAt] = useState(() => Date.now());

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    const formElement = event.currentTarget;
    setShowValidation(true);
    if (!formElement.checkValidity()) {
      setError("Complete every highlighted field before submitting the report.");
      const firstInvalid = formElement.querySelector<HTMLElement>(
        "input:invalid, select:invalid, textarea:invalid",
      );
      window.requestAnimationFrame(() => firstInvalid?.focus());
      return;
    }
    setSubmitting(true);
    const form = new FormData(formElement);
    const input: BribeReportInput = {
      department: String(form.get("department")),
      service: String(form.get("service")).trim(),
      city: String(form.get("city")).trim(),
      district: String(form.get("district")).trim(),
      amount: Number(form.get("amount")),
      outcome: String(form.get("outcome")) as BribeReport["outcome"],
      description: String(form.get("description")).trim(),
    };

    try {
      await createReport(
        input,
        Date.now() - openedAt,
        String(form.get("website") ?? ""),
      );
      setMessage("Report received. A moderator will review and approve it before it appears publicly.");
      formElement.reset();
      setOpenedAt(Date.now());
      setShowValidation(false);
    } catch (submissionError) {
      setError(
        submissionError instanceof ApiRequestError &&
          submissionError.status < 500
          ? submissionError.message
          : "The report could not be submitted. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="form-page shell-narrow">
      <button className="back-link" type="button" onClick={onBack}>{t("← BACK TO REPORTS")}</button>
      <h1>{t("Report an alleged bribe.")}</h1>
      <p className="form-intro">{t("Anonymous. No account. No identity fields. Reviewed before publishing.")}</p>
      <div className="privacy-promise"><b>{t("WE DO NOT ASK FOR OR STORE")}</b><span>{t("Name")}</span><span>{t("Email")}</span><span>{t("Phone")}</span><span>{t("Raw IP address")}</span><span>{t("Device ID")}</span></div>
      {error ? <div className="validation-summary" role="alert"><strong>{t("CHECK THE REPORT")}</strong><p>{t(error)}</p></div> : null}
      <form onSubmit={submit} className={showValidation ? "show-validation" : undefined} noValidate>
        <label className="bot-field" aria-hidden="true">
          Website
          <input
            name="website"
            type="text"
            tabIndex={-1}
            autoComplete="off"
          />
        </label>
        <fieldset><legend>{t("PUBLIC SERVICE")}</legend><label>{t("DEPARTMENT")}<select name="department" required defaultValue=""><option value="" disabled>{t("Select department")}</option>{departments.map((value) => <option key={value} value={value}>{t(value)}</option>)}</select></label><label>{t("SERVICE OR PROCESS")}<input name="service" required minLength={3} maxLength={100} placeholder={t("e.g. trade licence renewal")} /></label></fieldset>
        <fieldset><legend>{t("APPROXIMATE LOCATION")}</legend><div className="field-grid"><label>{t("CITY")}<input name="city" required minLength={2} maxLength={60} placeholder={t("City")} /></label><label>{t("DIVISION")}<select name="district" required defaultValue=""><option value="" disabled>{t("Select division")}</option>{divisions.map((division) => <option key={division} value={division}>{t(division)}</option>)}</select></label></div><p className="field-help">{t("Do not enter a home address, desk number, or a person’s name.")}</p></fieldset>
        <fieldset><legend>{t("THE DEMAND")}</legend><div className="field-grid"><label>{t("AMOUNT (BDT)")}<input name="amount" type="number" required min="1" max="100000000" inputMode="numeric" placeholder="৳" /></label><label>{t("WHAT HAPPENED?")}<select name="outcome" required defaultValue="refused"><option value="refused">{t("I refused")}</option><option value="paid">{t("I paid")}</option><option value="pending">{t("Demand is pending")}</option></select></label></div></fieldset>
        <fieldset><legend>{t("WHAT HAPPENED?")}</legend><label>{t("DESCRIPTION")}<textarea name="description" required minLength={20} maxLength={700} placeholder={t("Describe the service, how the unofficial payment was requested, and what happened next. Do not include names, phone numbers, or identifying details.")} /></label></fieldset>
        <div className="moderation-notice" role="note">
          <b>{t("MODERATION NOTICE")}</b>
          <p>{t("Your report will not appear immediately. A moderator will review and approve it before it is published.")}</p>
        </div>
        <label className="safety-check"><input type="checkbox" required /> <span>{t("I have not named or identified a private individual. I understand this is a public, unverified allegation and not an official complaint.")}</span></label>
        <button className="button button-dark submit-button" type="submit" disabled={submitting}>{submitting ? t("SUBMITTING…") : t("SUBMIT ANONYMOUS REPORT →")}</button>
        {message ? <p className="notice notice-success">{t(message)}</p> : null}
        <p className="form-footnote">{t("Submission passes through GhushSite’s protected server endpoint and remains private until a moderator approves it.")}</p>
      </form>
    </main>
  );
}

function PrivacyPage({ onBack }: { onBack: () => void }) {
  const { t } = useLanguage();
  return (
    <main className="privacy-page shell-narrow">
      <button className="back-link" type="button" onClick={onBack}>
        {t("← BACK TO REPORTS")}
      </button>
      <p className="eyebrow">{t("PRIVACY & SAFETY")}</p>
      <h1>
        {t("Collect the allegation.")}
        <br />
        <em>{t("Not the person.")}</em>
      </h1>
      <section>
        <h2>{t("What GhushSite stores")}</h2>
        <p>{t("GhushSite stores the report fields you submit and short-lived, rotating HMAC abuse-prevention keys in a separate private table. Those keys are not attached to report content.")}</p>
      </section>
      <section>
        <h2>{t("Optional third-party services")}</h2>
        <p>{t("Analytics and support widgets are disabled by default. A deployment operator may enable them with public environment variables and must disclose the resulting network processing in its own privacy notice.")}</p>
      </section>
      <section>
        <h2>{t("What GhushSite does not store")}</h2>
        <p>{t("No name, account, email, phone number, exact home address, raw IP-address column, analytics cookies, ad identifier, or device fingerprint.")}</p>
      </section>
      <section>
        <h2>{t("Infrastructure reality")}</h2>
        <p>{t("The hosting platform or a trusted reverse proxy briefly processes the request IP to derive a one-way, rotating rate-limit key. GhushSite never writes the raw address to Supabase or uses it to profile visitors.")}</p>
      </section>
      <section>
        <h2>{t("Safety rules")}</h2>
        <p>{t("Reports must describe systems and services, not identify alleged individuals. Every submission is an unverified allegation and is queued for moderation before publication.")}</p>
      </section>
    </main>
  );
}

function TeamMember({ name, role, bio, link }: { name: string; role: string; bio: string; link?: { href: string; label: string } }) {
  const { t } = useLanguage();
  const initials = name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2);
  return (
    <article className="team-card">
      <div className="team-photo" aria-hidden="true">{initials}</div>
      <span className="micro-label team-role">{t(role)}</span>
      <h2>{name}</h2>
      <p>{t(bio)}</p>
      {link ? (
        <a className="team-link" href={link.href} target="_blank" rel="noopener noreferrer">{link.label}</a>
      ) : null}
    </article>
  );
}

function TeamPage({ onBack, onSupport }: { onBack: () => void; onSupport: () => void }) {
  const { t } = useLanguage();
  return (
    <main className="team-page shell-narrow">
      <button className="back-link" type="button" onClick={onBack}>{t("← BACK TO REPORTS")}</button>
      <p className="eyebrow">{t("MEET THE TEAM")}</p>
      <h1>{t("The people behind")}<br /><em>{t("the ledger.")}</em></h1>
      <div className="team-grid">
        <TeamMember
          name="Shahed Sharif"
          role="FOUNDER"
          bio="Full-stack developer, 18. Builds and moderates GhushSite between A Level classes. Product engineer at DeliveryHobe and co-founder of AvanzaWorks."
          link={{ href: "https://fullmoonshade.com", label: "fullmoonshade.com" }}
        />
        <TeamMember
          name="Saif Kabeer"
          role="CO-FOUNDER"
          bio="Brought GhushSite its first readers. Runs GM Studios and SaaSMotionDesign.com at 23, while finishing a CS and Marketing double major at BRAC University."
          link={{ href: "https://saifkabeer.com", label: "saifkabeer.com" }}
        />
      </div>
      <div className="team-support">
        <button className="button button-dark" type="button" onClick={onSupport}>
          {t("BUY A FEATURED MESSAGE →")}
        </button>
      </div>
    </main>
  );
}
