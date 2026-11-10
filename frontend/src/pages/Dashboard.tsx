
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import PageContainer from "../components/layout/PageContainer";
import Button from "../components/common/Button";
import Loader from "../components/common/Loader";
import Badge from "../components/common/Badge";

import {
  getDatasets,
  getValidationRules,
  getProcessingRuns,
  getFailedProcessingRuns,
  getQualitySummary,
  getProcessingRunsSummary,
} from "../services/api";

import type { QualitySummary } from "../services/api";
import type { ProcessingRun } from "../types/processingRun";

export default function Dashboard() {
  const [runs, setRuns] = useState<ProcessingRun[]>([]);
  const [qualitySummary, setQualitySummary] =
    useState<QualitySummary | null>(null);
  const [monitoringSummary, setMonitoringSummary] = useState<
    Awaited<ReturnType<typeof getProcessingRunsSummary>> | null
  >(null);

  const [totalDatasets, setTotalDatasets] = useState(0);
  const [totalRules, setTotalRules] = useState(0);
  const [totalRuns, setTotalRuns] = useState(0);
  const [failedRuns, setFailedRuns] = useState(0);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [totalPages, setTotalPages] = useState(0);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  // Track initial loading to avoid replacing the page during pagination
  const hasLoaded = useRef(false);

  // Load dashboard data
  const loadDashboard = useCallback(
    async (isRefresh = false) => {
      try {
        if (isRefresh || hasLoaded.current) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError("");

        const [
          datasetData,
          ruleData,
          runData,
          failedRunData,
        ] = await Promise.all([
          getDatasets(),
          getValidationRules(),
          getProcessingRuns({
            page: currentPage,
            page_size: pageSize,
          }),
          getFailedProcessingRuns(1, 1),
        ]);

        setRuns(runData.items);
        setTotalDatasets(datasetData.total);
        setTotalRules(ruleData.total);
        setTotalRuns(runData.total);
        setFailedRuns(failedRunData.total);
        setTotalPages(runData.total_pages);

        // Load Task 5 error-monitoring statistics independently.
        const monitoringData = await getProcessingRunsSummary().catch(
          (monitoringError) => {
            console.error("Error Monitoring API error:", monitoringError);
            return null;
          }
        );
        setMonitoringSummary(monitoringData);

        // Get quality summary for latest available dataset
        const datasetId =
          runData.items[0]?.dataset_id ??
          datasetData.items[0]?.id;

        if (datasetId) {
          try {
            const summary = await getQualitySummary(datasetId);
            setQualitySummary(summary);
          } catch (summaryError) {
            console.error(
              "Quality Summary API error:",
              summaryError
            );
            setQualitySummary(null);
          }
        } else {
          setQualitySummary(null);
        }
      } catch (err) {
        console.error("Dashboard API error:", err);

        setError(
          "Unable to load dashboard data. Please check the backend server."
        );
      } finally {
        hasLoaded.current = true;
        setLoading(false);
        setRefreshing(false);
      }
    },
    [currentPage, pageSize]
  );

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  // Processing status
  function getStatus(status: string) {
    switch (status?.toLowerCase()) {
      case "completed":
        return "success" as const;

      case "failed":
        return "error" as const;

      case "running":
      case "processing":
        return "info" as const;

      case "pending":
        return "warning" as const;

      default:
        return "neutral" as const;
    }
  }

  // Date formatting
  function formatDate(value?: string | null) {
    if (!value) return "—";

    const date = new Date(value);

    return Number.isNaN(date.getTime())
      ? value
      : date.toLocaleString();
  }

  // Quality calculations
  const qualityScore = Number(
    qualitySummary?.quality_score ?? 0
  );

  const passed = Number(
    qualitySummary?.total_passed_checks ?? 0
  );

  const failed = Number(
    qualitySummary?.total_failed_checks ?? 0
  );

  const totalChecks = passed + failed;

  const passedPercentage =
    totalChecks > 0
      ? (passed / totalChecks) * 100
      : 0;

  const failedPercentage =
    totalChecks > 0
      ? (failed / totalChecks) * 100
      : 0;

  const safeQualityScore = Math.min(
    100,
    Math.max(0, qualityScore)
  );

  // KPI Cards
  const metrics = [
    {
      title: "Total Datasets",
      value: totalDatasets.toLocaleString(),
      subtitle: "Registered datasets",
      icon: "▤",
      color: "from-blue-400 to-blue-600",
      iconColor: "bg-blue-400/20",
    },
    {
      title: "Validation Rules",
      value: totalRules.toLocaleString(),
      subtitle: "Configured rules",
      icon: "☑",
      color: "from-violet-400 to-purple-700",
      iconColor: "bg-violet-300/20",
    },
    {
      title: "Processing Runs",
      value: totalRuns.toLocaleString(),
      subtitle: "Total executions",
      icon: "▷",
      color: "from-sky-400 to-blue-700",
      iconColor: "bg-sky-300/20",
    },
    {
      title: "Data Quality Score",
      value: qualitySummary
        ? `${safeQualityScore.toFixed(1)}%`
        : "—",
      subtitle: "Latest dataset quality",
      icon: "✓",
      color: "from-emerald-400 to-teal-700",
      iconColor: "bg-emerald-300/20",
    },
  ];

  const startRecord =
    totalRuns === 0
      ? 0
      : (currentPage - 1) * pageSize + 1;

  const endRecord = Math.min(
    currentPage * pageSize,
    totalRuns
  );

  // Initial loading only
  if (loading && !hasLoaded.current) {
    return (
      <PageContainer>
        <Loader message="Loading dashboard data..." />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="min-h-screen space-y-6 bg-slate-50/50 pb-6">

        {/* HEADER */}
        {/* <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
              Dashboard
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Data quality at a glance
            </p>
          </div>

          <Button
            variant="secondary"
            disabled={refreshing}
            onClick={() => void loadDashboard(true)}
          >
            {refreshing ? "Refreshing..." : "↻ Refresh"}
          </Button>
        </header> */}

        {/* ERROR */}
        {error && (
          <div
            role="alert"
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            <span>{error}</span>

            <Button
              onClick={() => void loadDashboard(true)}
            >
              Try Again
            </Button>
          </div>
        )}

        {/* KPI CARDS */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => (
            <article
              key={metric.title}
              className={`group relative flex min-h-[125px] items-center gap-4 overflow-hidden rounded-2xl bg-gradient-to-br ${metric.color} p-5 text-white shadow-lg transition duration-300 hover:-translate-y-1 hover:shadow-xl`}
            >
              <div
                className={`grid h-14 w-14 shrink-0 place-items-center rounded-2xl ${metric.iconColor} text-3xl backdrop-blur`}
              >
                {metric.icon}
              </div>

              <div className="relative z-10 min-w-0">
                <p className="text-xs font-medium text-white/80">
                  {metric.title}
                </p>

                <h3 className="mt-1 text-3xl font-extrabold tracking-tight">
                  {metric.value}
                </h3>

                <p className="mt-1 text-[10px] text-white/70">
                  {metric.subtitle}
                </p>
              </div>

              <div className="absolute -bottom-10 -right-6 h-28 w-28 rounded-full border border-white/10 transition group-hover:scale-125" />

              <div className="absolute -bottom-14 -right-12 h-36 w-36 rounded-full border border-white/10" />
            </article>
          ))}
        </section>

        {/* QUALITY OVERVIEW */}
        <section className="grid grid-cols-1 gap-5 xl:grid-cols-2">

          {/* QUALITY DONUT */}
          <article className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-extrabold text-slate-900">
                  ◉ Data Quality Overview
                </h2>

                <p className="mt-1 text-xs text-slate-400">
                  {qualitySummary?.dataset_name ??
                    "Latest available dataset"}
                </p>
              </div>

              <span className="rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-bold text-emerald-600">
                ● Live Data
              </span>
            </div>

            {qualitySummary ? (
              <div className="flex flex-col items-center justify-around gap-7 sm:flex-row">

                {/* SVG Donut Chart */}
                <div className="relative h-40 w-40 shrink-0">
                  <svg
                    viewBox="0 0 120 120"
                    className="-rotate-90"
                    aria-label={`Overall quality ${qualityScore.toFixed(1)} percent`}
                  >
                    <circle
                      cx="60"
                      cy="60"
                      r="48"
                      fill="none"
                      stroke="#ffe4e8"
                      strokeWidth="12"
                    />

                    <circle
                      cx="60"
                      cy="60"
                      r="48"
                      fill="none"
                      stroke="#14c98b"
                      strokeWidth="12"
                      strokeDasharray={`${(safeQualityScore / 100) * 301.59} 301.59`}
                      strokeLinecap="round"
                    />
                  </svg>

                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <strong className="text-2xl font-extrabold text-slate-900">
                      {safeQualityScore.toFixed(1)}%
                    </strong>

                    <span className="mt-1 text-[10px] text-slate-400">
                      Overall Quality
                    </span>
                  </div>
                </div>

                {/* Quality Stats */}
                <div className="w-full space-y-3">
                  <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                      <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                      Passed Checks
                    </div>

                    <strong className="text-sm text-slate-900">
                      {passed.toLocaleString()}
                    </strong>
                  </div>

                  <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                      <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                      Failed Checks
                    </div>

                    <strong className="text-sm text-slate-900">
                      {failed.toLocaleString()}
                    </strong>
                  </div>

                  <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                      <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                      Total Records
                    </div>

                    <strong className="text-sm text-slate-900">
                      {qualitySummary.total_records_processed.toLocaleString()}
                    </strong>
                  </div>

                  <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                      <span className="h-2.5 w-2.5 rounded-full bg-violet-500" />
                      Rules Executed
                    </div>

                    <strong className="text-sm text-slate-900">
                      {qualitySummary.total_rules_executed.toLocaleString()}
                    </strong>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex min-h-48 flex-col items-center justify-center text-center">
                <span className="text-4xl text-violet-400">◉</span>

                <p className="mt-3 text-sm font-bold text-slate-700">
                  Quality summary unavailable
                </p>

                <p className="mt-2 text-xs text-slate-400">
                  Upload a dataset and execute validation.
                </p>
              </div>
            )}
          </article>

          {/* VALIDATION BREAKDOWN */}
          <article className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-6">
              <h2 className="text-base font-extrabold text-slate-900">
                ▥ Validation Breakdown
              </h2>

              <p className="mt-1 text-xs text-slate-400">
                Passed and failed validation checks
              </p>
            </div>

            {qualitySummary && totalChecks > 0 ? (
              <div className="flex min-h-48 flex-col justify-center">
                <div className="text-center">
                  <h3 className="text-4xl font-extrabold text-slate-900">
                    {totalChecks.toLocaleString()}
                  </h3>

                  <p className="mt-1 text-xs text-slate-400">
                    Total Validation Checks
                  </p>
                </div>

                <div className="mt-4 flex h-4 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-500"
                    style={{
                      width: `${passedPercentage}%`,
                    }}
                  />

                  <div
                    className="h-full bg-rose-500 transition-all duration-500"
                    style={{
                      width: `${failedPercentage}%`,
                    }}
                  />
                </div>

                <div className="mt-6 grid grid-cols-2 gap-4">
                  <div className="rounded-xl bg-emerald-50 p-4">
                    <p className="text-xs text-emerald-700">
                      ● Passed
                    </p>

                    <h4 className="mt-2 text-xl font-extrabold text-emerald-800">
                      {passedPercentage.toFixed(1)}%
                    </h4>

                    <p className="mt-1 text-xs text-emerald-600">
                      {passed.toLocaleString()} checks
                    </p>
                  </div>

                  <div className="rounded-xl bg-rose-50 p-4">
                    <p className="text-xs text-rose-700">
                      ● Failed
                    </p>

                    <h4 className="mt-2 text-xl font-extrabold text-rose-800">
                      {failedPercentage.toFixed(1)}%
                    </h4>

                    <p className="mt-1 text-xs text-rose-600">
                      {failed.toLocaleString()} checks
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex min-h-48 flex-col items-center justify-center text-center">
                <span className="text-4xl text-violet-400">▥</span>

                <p className="mt-3 text-sm font-bold text-slate-700">
                  No validation breakdown available
                </p>

                <p className="mt-2 text-xs text-slate-400">
                  Run dataset validation to view results.
                </p>
              </div>
            )}
          </article>
        </section>

        {/* RECENT PROCESSING RUNS */}
        <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">

          <div className="flex flex-wrap items-center justify-between gap-3 p-5 sm:p-6">
            <div>
              <h2 className="text-base font-extrabold text-slate-900">
                ▷ Recent Processing Runs
              </h2>

              <p className="mt-1 text-xs text-slate-400">
                Latest processing activity from your platform
              </p>
            </div>

            <span className="rounded-full bg-violet-50 px-3 py-2 text-xs font-bold text-violet-700">
              {totalRuns} Total Runs
            </span>
          </div>

          {runs.length === 0 ? (
            <div className="flex min-h-48 flex-col items-center justify-center text-center">
              <span className="text-4xl text-violet-400">▷</span>

              <p className="mt-3 text-sm font-bold text-slate-700">
                No processing runs yet
              </p>

              <p className="mt-2 text-xs text-slate-400">
                Processing records will appear here after execution.
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-5 py-4">Run ID</th>
                      <th className="px-5 py-4">Dataset</th>
                      <th className="px-5 py-4">Status</th>
                      <th className="px-5 py-4">Records Processed</th>
                      <th className="px-5 py-4">Started At</th>
                    </tr>
                  </thead>

                  <tbody>
                    {runs.map((run) => (
                      <tr
                        key={run.id}
                        className="border-b border-slate-100 transition hover:bg-violet-50/40"
                      >
                        <td className="px-5 py-4 font-bold text-violet-700">
                          #{run.id}
                        </td>

                        <td className="px-5 py-4 text-slate-700">
                          Dataset #{run.dataset_id}
                        </td>

                        <td className="px-5 py-4">
                          <Badge status={getStatus(run.status)}>
                            {run.status}
                          </Badge>
                        </td>

                        <td className="px-5 py-4 font-medium text-slate-700">
                          {(run.records_processed ?? 0).toLocaleString()}
                        </td>

                        <td className="px-5 py-4 text-xs text-slate-500">
                          {formatDate(run.started_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* PAGINATION */}
              <div className="flex flex-col gap-4 border-t border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">

                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                  <span>
                    Showing{" "}
                    <strong className="text-slate-900">
                      {startRecord}–{endRecord}
                    </strong>{" "}
                    of{" "}
                    <strong className="text-slate-900">
                      {totalRuns}
                    </strong>{" "}
                    runs
                  </span>

                  <select
                    value={pageSize}
                    onChange={(event) => {
                      setPageSize(Number(event.target.value));
                      setCurrentPage(1);
                    }}
                    aria-label="Rows per page"
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                  </select>
                </div>

                <div className="flex items-center gap-3">
                  <Button
                    variant="secondary"
                    disabled={currentPage <= 1 || refreshing}
                    onClick={() => {
                      setCurrentPage((page) =>
                        Math.max(1, page - 1)
                      );
                    }}
                  >
                    Previous
                  </Button>

                  <span className="whitespace-nowrap text-xs font-semibold text-slate-600">
                    Page {currentPage} of {Math.max(totalPages, 1)}
                  </span>

                  <Button
                    variant="secondary"
                    disabled={
                      currentPage >= totalPages ||
                      totalPages === 0 ||
                      refreshing
                    }
                    onClick={() => {
                      setCurrentPage((page) =>
                        Math.min(totalPages, page + 1)
                      );
                    }}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </section>

        {/* TASK 5: ERROR MONITORING */}
        <section className="space-y-5 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-extrabold text-slate-900">
                Error Monitoring Overview
              </h2>
              <p className="mt-1 text-xs text-slate-400">
                Processing failures and validation issues from persisted records
              </p>
            </div>
            <span className="rounded-full bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700">
              {monitoringSummary?.processing_runs.failed ?? failedRuns} Failed Runs
            </span>
          </div>

          {monitoringSummary ? (
            <>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-xs text-slate-500">Total Validation Failures</p>
                  <p className="mt-2 text-2xl font-extrabold text-slate-900">
                    {monitoringSummary.validation.total_failures.toLocaleString()}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-xs text-slate-500">Unresolved Errors</p>
                  <p className="mt-2 text-2xl font-extrabold text-rose-600">
                    {monitoringSummary.error_monitoring.unresolved_errors.toLocaleString()}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-xs text-slate-500">Completed Runs</p>
                  <p className="mt-2 text-2xl font-extrabold text-emerald-600">
                    {monitoringSummary.processing_runs.completed.toLocaleString()}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-xs text-slate-500">Failed Runs</p>
                  <p className="mt-2 text-2xl font-extrabold text-rose-600">
                    {monitoringSummary.processing_runs.failed.toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
                <div className="rounded-xl border border-slate-100 p-4">
                  <h3 className="mb-4 text-sm font-bold text-slate-800">Error Severity Distribution</h3>
                  <div className="space-y-3">
                    {(["CRITICAL", "HIGH", "MEDIUM", "LOW"] as const).map((severity) => {
                      const count = monitoringSummary.error_monitoring.severity_distribution[severity] ?? 0;
                      const totalErrors = Object.values(monitoringSummary.error_monitoring.severity_distribution).reduce((sum, value) => sum + value, 0);
                      const width = totalErrors > 0 ? (count / totalErrors) * 100 : 0;
                      const barColor = severity === "CRITICAL" ? "bg-red-600" : severity === "HIGH" ? "bg-orange-500" : severity === "MEDIUM" ? "bg-amber-500" : "bg-blue-500";
                      return (
                        <div key={severity}>
                          <div className="mb-1 flex items-center justify-between text-xs">
                            <span className="font-medium text-slate-600">{severity}</span>
                            <span className="font-bold text-slate-800">{count}</span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                            <div className={`h-full rounded-full ${barColor}`} style={{ width: `${width}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-100 p-4">
                  <h3 className="mb-4 text-sm font-bold text-slate-800">Frequent Failing Rules</h3>
                  {monitoringSummary.frequent_failing_rules.length > 0 ? (
                    <div className="space-y-3">
                      {monitoringSummary.frequent_failing_rules.map((rule) => (
                        <div key={rule.rule_id} className="flex items-center justify-between gap-3 border-b border-slate-100 pb-2 last:border-0">
                          <span className="min-w-0 truncate text-xs text-slate-600">{rule.rule_name}</span>
                          <span className="shrink-0 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-700">
                            {rule.failure_count} failures
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400">No validation failures recorded.</p>
                  )}
                </div>

                <div className="rounded-xl border border-slate-100 p-4">
                  <h3 className="mb-4 text-sm font-bold text-slate-800">Recurring Error Datasets</h3>
                  {monitoringSummary.error_monitoring.recurring_error_datasets.length > 0 ? (
                    <div className="space-y-3">
                      {monitoringSummary.error_monitoring.recurring_error_datasets.map((dataset) => (
                        <div key={dataset.dataset_id} className="flex items-center justify-between gap-3 border-b border-slate-100 pb-2 last:border-0">
                          <span className="min-w-0 truncate text-xs text-slate-600">
                            {dataset.dataset_name} (#{dataset.dataset_id})
                          </span>
                          <span className="shrink-0 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700">
                            {dataset.error_count} errors
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400">No recurring error datasets recorded.</p>
                  )}
                </div>

                <div className="rounded-xl border border-slate-100 p-4">
                  <h3 className="mb-4 text-sm font-bold text-slate-800">Run Status Summary</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg bg-emerald-50 p-3">
                      <p className="text-xs text-emerald-700">Completed</p>
                      <p className="mt-1 text-xl font-extrabold text-emerald-800">{monitoringSummary.processing_runs.completed}</p>
                    </div>
                    <div className="rounded-lg bg-rose-50 p-3">
                      <p className="text-xs text-rose-700">Failed</p>
                      <p className="mt-1 text-xl font-extrabold text-rose-800">{monitoringSummary.processing_runs.failed}</p>
                    </div>
                    <div className="rounded-lg bg-amber-50 p-3">
                      <p className="text-xs text-amber-700">Pending</p>
                      <p className="mt-1 text-xl font-extrabold text-amber-800">{monitoringSummary.processing_runs.pending}</p>
                    </div>
                    <div className="rounded-lg bg-blue-50 p-3">
                      <p className="text-xs text-blue-700">Processing</p>
                      <p className="mt-1 text-xl font-extrabold text-blue-800">{monitoringSummary.processing_runs.processing}</p>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="rounded-xl bg-slate-50 p-5 text-center">
              <p className="text-sm font-semibold text-slate-700">Error monitoring summary unavailable</p>
              <p className="mt-1 text-xs text-slate-500">Check the processing-runs summary API and refresh the dashboard.</p>
              <Button className="mt-3" variant="secondary" disabled={refreshing} onClick={() => void loadDashboard(true)}>
                {refreshing ? "Refreshing..." : "Refresh Dashboard"}
              </Button>
            </div>
          )}
        </section>

        {/* LATEST PROCESSING RUN */}
        {qualitySummary?.latest_run && (
          <section className="flex flex-wrap items-center justify-between gap-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">

            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-emerald-50 text-xl font-bold text-emerald-600">
                ✓
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Latest Processing Run
                </h3>

                <p className="mt-1 text-xs text-slate-400">
                  Run #
                  {qualitySummary.latest_run.processing_run_id}
                </p>
              </div>
            </div>

            <div>
              <p className="mb-2 text-[10px] text-slate-400">
                Status
              </p>

              <Badge
                status={getStatus(
                  qualitySummary.latest_run.status
                )}
              >
                {qualitySummary.latest_run.status}
              </Badge>
            </div>

            <div>
              <p className="mb-2 text-[10px] text-slate-400">
                Started At
              </p>

              <strong className="text-xs text-slate-700">
                {formatDate(
                  qualitySummary.latest_run.started_at
                )}
              </strong>
            </div>

            <div>
              <p className="mb-2 text-[10px] text-slate-400">
                Failed Runs
              </p>

              <strong className="text-sm font-bold text-rose-600">
                {failedRuns}
              </strong>
            </div>
          </section>
        )}

      </div>
    </PageContainer>
  );
}
