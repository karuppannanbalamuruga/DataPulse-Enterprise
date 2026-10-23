
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
} from "../services/api";

import type { ProcessingRun } from "../types/processingRun";

export default function Dashboard() {
  const [runs, setRuns] = useState<ProcessingRun[]>([]);

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

  // Fetch dashboard counts and the current page of processing runs
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

  function formatDate(value?: string | null) {
    if (!value) return "—";

    const date = new Date(value);

    return Number.isNaN(date.getTime())
      ? value
      : date.toLocaleString();
  }

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

  const endRecord = Math.min(currentPage * pageSize, totalRuns);

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

      {/* Metric cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <div
            key={metric.title}
            className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <p className="text-sm font-medium text-slate-500">
              {metric.title}
            </p>
            <p className={`mt-3 text-3xl font-bold ${metric.color}`}>
              {metric.value}
            </p>
            <p className="mt-2 text-xs text-slate-400">
              {metric.description}
            </p>
          </div>
        ))}
      </div>

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
                    <th className="px-6 py-4 font-medium">Run ID</th>
                    <th className="px-6 py-4 font-medium">Dataset ID</th>
                    <th className="px-6 py-4 font-medium">Status</th>
                    <th className="px-6 py-4 font-medium">
                      Records Processed
                    </th>
                    <th className="px-6 py-4 font-medium">Started At</th>
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
                      <td className="px-6 py-4">{run.dataset_id}</td>
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
                    setCurrentPage((page) => Math.max(1, page - 1))
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
