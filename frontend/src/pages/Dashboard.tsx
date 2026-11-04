
import { useCallback, useEffect, useState } from "react";

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
} from "../services/api";

import type { QualitySummary } from "../services/api";
import type { ProcessingRun } from "../types/processingRun";

export default function Dashboard() {
  const [runs, setRuns] = useState<ProcessingRun[]>([]);
  const [qualitySummary, setQualitySummary] =
    useState<QualitySummary | null>(null);

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

  // Fetch dashboard data
  const loadDashboard = useCallback(
    async (isRefresh = false) => {
      try {
        if (isRefresh) {
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

        // Fetch quality summary for the latest run's dataset
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
        setLoading(false);
        setRefreshing(false);
      }
    },
    [currentPage, pageSize]
  );

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  // Processing status badge
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

  // Format date
  function formatDate(value?: string | null) {
    if (!value) return "—";

    const date = new Date(value);

    return Number.isNaN(date.getTime())
      ? value
      : date.toLocaleString();
  }

  // Dashboard metric cards
  const metrics = [
    {
      title: "Total Datasets",
      value: totalDatasets,
      description: "Datasets registered",
      color: "text-blue-600",
    },
    {
      title: "Validation Rules",
      value: totalRules,
      description: "Rules configured",
      color: "text-violet-600",
    },
    {
      title: "Processing Runs",
      value: totalRuns,
      description: "Runs recorded",
      color: "text-emerald-600",
    },
    {
      title: "Failed Runs",
      value: failedRuns,
      description: "Runs with failed status",
      color: "text-red-600",
    },
  ];

  const startRecord =
    totalRuns === 0 ? 0 : (currentPage - 1) * pageSize + 1;

  const endRecord = Math.min(
    currentPage * pageSize,
    totalRuns
  );

  if (loading) {
    return (
      <PageContainer>
        <Loader message="Loading dashboard data..." />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      {/* Dashboard heading */}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Dashboard
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Overview of your DataPulse Enterprise platform.
          </p>
        </div>

        <Button
          variant="secondary"
          disabled={refreshing}
          onClick={() => void loadDashboard(true)}
        >
          {refreshing ? "Refreshing..." : "Refresh"}
        </Button>
      </div>

      {/* Error message */}
      {error && (
        <div
          role="alert"
          className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4"
        >
          <p className="text-sm text-red-700">{error}</p>
          <Button
            className="mt-3"
            onClick={() => void loadDashboard()}
          >
            Try Again
          </Button>
        </div>
      )}

      {/* Main dashboard metrics */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <div
            key={metric.title}
            className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <p className="text-sm font-medium text-slate-500">
              {metric.title}
            </p>

            <p
              className={`mt-3 text-3xl font-bold ${metric.color}`}
            >
              {metric.value}
            </p>

            <p className="mt-2 text-xs text-slate-400">
              {metric.description}
            </p>
          </div>
        ))}
      </div>

      {/* Data Quality Summary */}
      <section className="mt-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-slate-900">
            Data Quality Summary
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Quality metrics from the latest available dataset.
          </p>
        </div>

        {qualitySummary ? (
          <>
            {/* Dataset name and quality score */}
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-slate-500">
                  Dataset
                </p>
                <h3 className="mt-1 text-lg font-semibold text-slate-900">
                  {qualitySummary.dataset_name}
                </h3>
                <p className="mt-1 text-xs text-slate-400">
                  Dataset ID: {qualitySummary.dataset_id}
                </p>
              </div>

              <div className="sm:text-right">
                <p className="text-sm text-slate-500">
                  Overall Quality Score
                </p>
                <p className="mt-1 text-4xl font-bold text-emerald-600">
                  {Number(qualitySummary.quality_score).toFixed(2)}%
                </p>
              </div>
            </div>

            {/* Quality progress bar */}
            <div className="mb-6">
              <div className="mb-2 flex justify-between text-xs text-slate-500">
                <span>Data Quality</span>
                <span>
                  {Number(qualitySummary.quality_score).toFixed(2)}%
                </span>
              </div>

              <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all"
                  style={{
                    width: `${Math.min(
                      100,
                      Math.max(0, qualitySummary.quality_score)
                    )}%`,
                  }}
                />
              </div>
            </div>

            {/* Quality metric cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-lg bg-slate-50 p-4">
                <p className="text-sm text-slate-500">
                  Total Records
                </p>
                <p className="mt-2 text-2xl font-bold text-slate-800">
                  {qualitySummary.total_records_processed}
                </p>
              </div>

              <div className="rounded-lg bg-slate-50 p-4">
                <p className="text-sm text-slate-500">
                  Rules Executed
                </p>
                <p className="mt-2 text-2xl font-bold text-violet-600">
                  {qualitySummary.total_rules_executed}
                </p>
              </div>

              <div className="rounded-lg bg-slate-50 p-4">
                <p className="text-sm text-slate-500">
                  Passed Checks
                </p>
                <p className="mt-2 text-2xl font-bold text-emerald-600">
                  {qualitySummary.total_passed_checks}
                </p>
              </div>

              <div className="rounded-lg bg-slate-50 p-4">
                <p className="text-sm text-slate-500">
                  Failed Checks
                </p>
                <p className="mt-2 text-2xl font-bold text-red-600">
                  {qualitySummary.total_failed_checks}
                </p>
              </div>
            </div>

            {/* Processing information */}
            <div className="mt-6 border-t border-slate-200 pt-5">
              <h3 className="text-sm font-semibold text-slate-700">
                Latest Processing Run
              </h3>

              {qualitySummary.latest_run ? (
                <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <p className="text-xs text-slate-500">
                      Run ID
                    </p>
                    <p className="mt-1 font-medium text-slate-800">
                      #{qualitySummary.latest_run.processing_run_id}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500">
                      Status
                    </p>
                    <div className="mt-1">
                      <Badge
                        status={getStatus(
                          qualitySummary.latest_run.status
                        )}
                      >
                        {qualitySummary.latest_run.status}
                      </Badge>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500">
                      Started At
                    </p>
                    <p className="mt-1 text-sm text-slate-800">
                      {formatDate(
                        qualitySummary.latest_run.started_at
                      )}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500">
                      Completed At
                    </p>
                    <p className="mt-1 text-sm text-slate-800">
                      {formatDate(
                        qualitySummary.latest_run.completed_at
                      )}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="mt-2 text-sm text-slate-500">
                  No completed processing run available.
                </p>
              )}
            </div>
          </>
        ) : (
          <div className="rounded-lg bg-slate-50 p-6 text-center">
            <p className="font-medium text-slate-700">
              Quality summary not available
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Upload a dataset and execute validation to view quality metrics.
            </p>
          </div>
        )}
      </section>

      {/* Recent processing runs */}
      <section className="mt-8 overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-6 py-5">
          <h2 className="text-lg font-semibold text-slate-900">
            Recent Processing Runs
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Latest processing activity from the backend.
          </p>
        </div>

        {runs.length === 0 ? (
          <div className="p-8 text-center">
            <p className="font-medium text-slate-700">
              No processing runs yet
            </p>

            <p className="mt-2 text-sm text-slate-500">
              Processing records will appear here when available.
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-6 py-4 font-medium">
                      Run ID
                    </th>
                    <th className="px-6 py-4 font-medium">
                      Dataset ID
                    </th>
                    <th className="px-6 py-4 font-medium">
                      Status
                    </th>
                    <th className="px-6 py-4 font-medium">
                      Records Processed
                    </th>
                    <th className="px-6 py-4 font-medium">
                      Started At
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {runs.map((run) => (
                    <tr
                      key={run.id}
                      className="border-t border-slate-100 hover:bg-slate-50"
                    >
                      <td className="px-6 py-4 font-medium text-slate-800">
                        #{run.id}
                      </td>

                      <td className="px-6 py-4">
                        {run.dataset_id}
                      </td>

                      <td className="px-6 py-4">
                        <Badge status={getStatus(run.status)}>
                          {run.status}
                        </Badge>
                      </td>

                      <td className="px-6 py-4">
                        {run.records_processed ?? 0}
                      </td>

                      <td className="px-6 py-4 text-slate-500">
                        {formatDate(run.started_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex flex-col gap-4 border-t border-slate-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-sm text-slate-500">
                  Showing{" "}
                  <span className="font-medium text-slate-800">
                    {startRecord}–{endRecord}
                  </span>{" "}
                  of{" "}
                  <span className="font-medium text-slate-800">
                    {totalRuns}
                  </span>{" "}
                  runs
                </p>

                <label
                  htmlFor="runs-page-size"
                  className="text-sm text-slate-500"
                >
                  Rows per page
                </label>

                <select
                  id="runs-page-size"
                  value={pageSize}
                  onChange={(event) => {
                    setPageSize(Number(event.target.value));
                    setCurrentPage(1);
                  }}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
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
                  onClick={() =>
                    setCurrentPage((page) =>
                      Math.max(1, page - 1)
                    )
                  }
                >
                  Previous
                </Button>

                <span className="whitespace-nowrap text-sm text-slate-700">
                  Page {currentPage} of {Math.max(totalPages, 1)}
                </span>

                <Button
                  variant="secondary"
                  disabled={
                    currentPage >= totalPages ||
                    totalPages === 0 ||
                    refreshing
                  }
                  onClick={() =>
                    setCurrentPage((page) =>
                      Math.min(totalPages, page + 1)
                    )
                  }
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
      </section>
    </PageContainer>
  );
}
