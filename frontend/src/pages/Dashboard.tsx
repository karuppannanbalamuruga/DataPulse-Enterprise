
import { useCallback, useEffect, useState } from "react";
import PageContainer from "../components/layout/PageContainer";
import Button from "../components/common/Button";
import Loader from "../components/common/Loader";
import Badge from "../components/common/Badge";

import {
  getDatasets,
  getValidationRules,
  getProcessingRuns,
} from "../services/api";

import type { Dataset } from "../types/dataset";
import type { ValidationRule } from "../types/validationRule";
import type { ProcessingRun } from "../types/processingRun";

export default function Dashboard() {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [rules, setRules] = useState<ValidationRule[]>([]);
  const [runs, setRuns] = useState<ProcessingRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Load dashboard data from backend APIs
  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [datasetData, ruleData, runData] = await Promise.all([
        getDatasets(),
        getValidationRules(),
        getProcessingRuns(),
      ]);

      setDatasets(datasetData.items);
      setRules(ruleData.items);
      setRuns(runData.items);
    } catch (err) {
      console.error("Dashboard API error:", err);
      setError("Unable to load dashboard data. Please check the backend.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  // Calculate metrics from actual API data
  const totalDatasets = datasets.length;
  const totalRules = rules.length;
  const totalRuns = runs.length;
  const failedRuns = runs.filter(
    (run) => run.status?.toLowerCase() === "failed"
  ).length;

  function getStatus(status: string) {
    switch (status?.toLowerCase()) {
      case "completed":
        return "success" as const;
      case "failed":
        return "error" as const;
      case "running":
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

        {/* <Button
          variant="secondary"
          onClick={() => void loadDashboard()}
          disabled={loading}
        >
          Refresh Data
        </Button> */}
      </div>

      {/* API error message */}
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

      {/* Dashboard metric cards */}
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
                {[...runs]
                  .sort((a, b) => b.id - a.id)
                  .slice(0, 5)
                  .map((run) => (
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
        )}
      </section>
    </PageContainer>
  );
}
