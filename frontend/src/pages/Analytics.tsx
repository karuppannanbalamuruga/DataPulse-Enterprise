
import { useCallback, useEffect, useState } from "react";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

import {
  getDatasets,
  getAnalyticsOverview,
  getQualityTrends,
  getProcessingTrends,
  getDatasetComparison,
  getValidationPerformance,
  exportAnalyticsCSV,
} from "../services/api";

import type { Dataset } from "../types/dataset";

import type {
  AnalyticsOverview,
  QualityTrend,
  ProcessingTrend,
  DatasetComparison,
  ValidationPerformance,
} from "../types/analytics";

type GroupBy = "daily" | "weekly" | "monthly";

export default function Analytics() {
  // ==============================
  // STATES
  // ==============================

  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);

  const [datasets, setDatasets] = useState<Dataset[]>([]);

  const [qualityTrends, setQualityTrends] = useState<QualityTrend[]>([]);

  const [processingTrends, setProcessingTrends] = useState<ProcessingTrend[]>([]);

  const [comparisons, setComparisons] = useState<DatasetComparison[]>([]);

  const [validationPerformance, setValidationPerformance] = useState<
    ValidationPerformance[]
  >([]);

  const [datasetId, setDatasetId] = useState("");

  const [comparisonIds, setComparisonIds] = useState<string[]>([]);

  const [startDate, setStartDate] = useState("");

  const [endDate, setEndDate] = useState("");

  const [groupBy, setGroupBy] = useState<GroupBy>("daily");

  const [loading, setLoading] = useState(true);

  const [initialized, setInitialized] = useState(false);

  const [exporting, setExporting] = useState(false);

  const [error, setError] = useState("");

  // ==============================
  // LOAD ANALYTICS DATA
  // ==============================

  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const filters = {
        ...(datasetId ? { dataset_id: Number(datasetId) } : {}),
        ...(startDate ? { start_date: startDate } : {}),
        ...(endDate ? { end_date: endDate } : {}),
        group_by: groupBy,
      };

      const [
        overviewData,
        qualityData,
        processingData,
        validationData,
      ] = await Promise.all([
        getAnalyticsOverview(),

        getQualityTrends(filters),

        getProcessingTrends(filters),

        getValidationPerformance({
          ...(datasetId ? { dataset_id: Number(datasetId) } : {}),
          ...(startDate ? { start_date: startDate } : {}),
          ...(endDate ? { end_date: endDate } : {}),
        }),
      ]);

      setOverview(overviewData);

      setQualityTrends(qualityData);

      setProcessingTrends(processingData);

      setValidationPerformance(validationData);

      // Dataset comparison

      if (comparisonIds.length >= 2) {
        const comparisonData = await getDatasetComparison({
          dataset_ids: comparisonIds.map(Number),

          ...(startDate ? { start_date: startDate } : {}),

          ...(endDate ? { end_date: endDate } : {}),
        });

        setComparisons(comparisonData.items);
      } else {
        setComparisons([]);
      }
    } catch (err) {
      console.error("Analytics loading error:", err);

      setError(
        "Unable to load analytics data. Please check the backend server and try again."
      );
    } finally {
      setLoading(false);
    }
  }, [
    datasetId,
    startDate,
    endDate,
    groupBy,
    comparisonIds,
  ]);

  // ==============================
  // INITIAL DATA LOADING
  // ==============================

  useEffect(() => {
    const initializeAnalytics = async () => {
      try {
        setLoading(true);

        setError("");

        const datasetResponse = await getDatasets({
          page: 1,
          page_size: 100,
        });

        const datasetItems = datasetResponse.items ?? [];

        setDatasets(datasetItems);

        // Select first two datasets by default

        const defaultComparisonIds = datasetItems
          .slice(0, 2)
          .map((dataset) => String(dataset.id));

        setComparisonIds(defaultComparisonIds);
      } catch (err) {
        console.error("Dataset loading error:", err);

        setError(
          "Unable to load datasets. Please check the backend server."
        );
      } finally {
        setLoading(false);

        setInitialized(true);
      }
    };

    void initializeAnalytics();
  }, []);

  // ==============================
  // AUTOMATIC SEARCH
  // ==============================

  useEffect(() => {
    if (!initialized) return;

    // Validate date range

    if (startDate && endDate && startDate > endDate) {
      setError("Start date cannot be later than end date.");
      return;
    }

    // Wait 500ms before calling APIs

    const timer = window.setTimeout(() => {
      void loadAnalytics();
    }, 500);

    return () => {
      window.clearTimeout(timer);
    };
  }, [initialized, loadAnalytics, startDate, endDate]);

  // ==============================
  // CSV EXPORT
  // ==============================

  const handleExport = async () => {
    try {
      setExporting(true);

      setError("");

      await exportAnalyticsCSV({
        ...(datasetId ? { dataset_id: Number(datasetId) } : {}),

        ...(startDate ? { start_date: startDate } : {}),

        ...(endDate ? { end_date: endDate } : {}),
      });
    } catch (err) {
      console.error("CSV export error:", err);

      setError("CSV export failed. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  // ==============================
  // COMPARISON SELECTION
  // ==============================

  const handleComparisonChange = (
    event: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const selected = Array.from(
      event.target.selectedOptions,
      (option) => option.value
    );

    setComparisonIds(selected);
  };

  // ==============================
  // FORMAT HELPERS
  // ==============================

  const formatNumber = (value: number | null | undefined) =>
    Number(value ?? 0).toLocaleString("en-IN");

  const formatScore = (value: number | null | undefined) =>
    `${Number(value ?? 0).toFixed(2)}%`;

  // ==============================
  // KPI CARDS
  // ==============================

  const kpiCards = [
    {
      title: "Overall Quality Score",
      value: formatScore(overview?.overall_quality_score),
      subtitle: "Average completed run quality",
      icon: "◈",
      color: "from-blue-500 to-indigo-500",
    },
    {
      title: "Datasets Monitored",
      value: formatNumber(overview?.total_datasets),
      subtitle: "Total registered datasets",
      icon: "▦",
      color: "from-violet-500 to-purple-500",
    },
    {
      title: "Total Processing Runs",
      value: formatNumber(overview?.total_processing_runs),
      subtitle: "All recorded runs",
      icon: "↻",
      color: "from-cyan-500 to-blue-500",
    },
    {
      title: "Successful Runs",
      value: formatNumber(overview?.successful_processing_runs),
      subtitle: "Completed successfully",
      icon: "✓",
      color: "from-emerald-500 to-green-500",
    },
    {
      title: "Failed Runs",
      value: formatNumber(overview?.failed_processing_runs),
      subtitle: "Failed processing runs",
      icon: "!",
      color: "from-orange-500 to-red-500",
    },
    {
      title: "Validation Failures",
      value: formatNumber(overview?.total_validation_failures),
      subtitle: "Total validation issues",
      icon: "⚠",
      color: "from-pink-500 to-rose-500",
    },
  ];

  // ==============================
  // UI
  // ==============================

  return (
    <div className="space-y-6 p-4 md:p-6">

      {/* PAGE INTRO */}

      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div></div>

        <button
          onClick={handleExport}
          disabled={exporting || loading}
          className="rounded-xl bg-gradient-to-r from-blue-500 to-violet-500 px-5 py-2 text-sm font-bold text-white shadow-lg shadow-blue-200 transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {exporting ? "Exporting..." : "↓ Export CSV"}
        </button>
      </div>

      {/* FILTERS */}

      <section className="rounded-2xl border border-white bg-white/80 p-5 shadow-sm">

        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-bold text-slate-800">
            Analytics Filters
          </h3>

          <span className="flex items-center gap-2 text-xs font-semibold text-emerald-600">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Auto updating
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">

          {/* DATASET */}

          <div>
            <label className="mb-2 block text-xs font-semibold text-slate-600">
              Dataset
            </label>

            <select
              value={datasetId}
              onChange={(e) => setDatasetId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-violet-400"
            >
              <option value="">All Datasets</option>

              {datasets.map((dataset) => (
                <option key={dataset.id} value={dataset.id}>
                  {dataset.name}
                </option>
              ))}
            </select>
          </div>

          {/* START DATE */}

          <div>
            <label className="mb-2 block text-xs font-semibold text-slate-600">
              Start Date
            </label>

            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-violet-400"
            />
          </div>

          {/* END DATE */}

          <div>
            <label className="mb-2 block text-xs font-semibold text-slate-600">
              End Date
            </label>

            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-violet-400"
            />
          </div>

          {/* GROUP BY */}

          <div>
            <label className="mb-2 block text-xs font-semibold text-slate-600">
              Group By
            </label>

            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as GroupBy)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-violet-400"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>

        </div>

        {loading && initialized && (
          <p className="mt-3 text-xs font-medium text-violet-600">
            Updating analytics...
          </p>
        )}

      </section>

      {/* ERROR MESSAGE */}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* LOADING */}

      {loading && (
        <div className="rounded-2xl bg-white p-10 text-center text-sm font-medium text-slate-500 shadow-sm">
          Loading analytics data...
        </div>
      )}

      {!loading && overview && (
        <>

          {/* KPI CARDS */}

          <section>

            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-800">
                Key Performance Indicators
              </h3>

              <span className="text-xs text-slate-400">
                Live API data
              </span>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">

              {kpiCards.map((card) => (
                <div
                  key={card.title}
                  className="rounded-2xl border border-white bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="flex items-start justify-between">

                    <div>
                      <p className="text-sm font-semibold text-slate-500">
                        {card.title}
                      </p>

                      <h4 className="mt-3 text-3xl font-extrabold text-slate-800">
                        {card.value}
                      </h4>

                      <p className="mt-2 text-xs text-slate-400">
                        {card.subtitle}
                      </p>
                    </div>

                    <div
                      className={`grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br ${card.color} text-xl font-bold text-white shadow-lg`}
                    >
                      {card.icon}
                    </div>

                  </div>
                </div>
              ))}

            </div>
          </section>

          {/* QUALITY AND PROCESSING CHARTS */}

          <section className="grid grid-cols-1 gap-5 xl:grid-cols-2">

            {/* QUALITY TREND */}

            <div className="rounded-2xl border border-white bg-white p-5 shadow-sm">

              <div className="mb-5">
                <h3 className="font-bold text-slate-800">
                  Historical Quality Trends
                </h3>

                <p className="mt-1 text-xs text-slate-400">
                  Average quality score over time
                </p>
              </div>

              <div className="h-[300px] w-full">

                {qualityTrends.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">

                    <LineChart data={qualityTrends}>

                      <CartesianGrid strokeDasharray="3 3" vertical={false} />

                      <XAxis dataKey="period" tick={{ fontSize: 11 }} />

                      <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />

                      <Tooltip />

                      <Legend />

                      <Line
                        type="monotone"
                        dataKey="average_quality_score"
                        name="Quality Score"
                        stroke="#6366f1"
                        strokeWidth={3}
                        dot={{ r: 4 }}
                        activeDot={{ r: 7 }}
                      />

                    </LineChart>

                  </ResponsiveContainer>
                ) : (
                  <EmptyChart message="No quality trend data available." />
                )}

              </div>
            </div>

            {/* PROCESSING TREND */}

            <div className="rounded-2xl border border-white bg-white p-5 shadow-sm">

              <div className="mb-5">
                <h3 className="font-bold text-slate-800">
                  Processing Trends
                </h3>

                <p className="mt-1 text-xs text-slate-400">
                  Successful and failed runs over time
                </p>
              </div>

              <div className="h-[300px] w-full">

                {processingTrends.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">

                    <BarChart data={processingTrends}>

                      <CartesianGrid strokeDasharray="3 3" vertical={false} />

                      <XAxis dataKey="period" tick={{ fontSize: 11 }} />

                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />

                      <Tooltip />

                      <Legend />

                      <Bar
                        dataKey="successful_runs"
                        name="Successful"
                        fill="#10b981"
                        radius={[5, 5, 0, 0]}
                      />

                      <Bar
                        dataKey="failed_runs"
                        name="Failed"
                        fill="#f43f5e"
                        radius={[5, 5, 0, 0]}
                      />

                    </BarChart>

                  </ResponsiveContainer>
                ) : (
                  <EmptyChart message="No processing trend data available." />
                )}

              </div>
            </div>

          </section>

          {/* DATASET COMPARISON */}

          <section className="rounded-2xl border border-white bg-white p-5 shadow-sm">

            <div className="mb-5">
              <h3 className="font-bold text-slate-800">
                Dataset Comparison
              </h3>

              <p className="mt-1 text-xs text-slate-400">
                Compare quality scores across multiple datasets.
                Select at least two datasets.
              </p>
            </div>

            <div className="mb-5">

              <label className="mb-2 block text-xs font-semibold text-slate-600">
                Select Datasets
              </label>

              <select
                multiple
                value={comparisonIds}
                onChange={handleComparisonChange}
                className="min-h-28 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none focus:border-violet-400"
              >
                {datasets.map((dataset) => (
                  <option key={dataset.id} value={String(dataset.id)}>
                    {dataset.name}
                  </option>
                ))}
              </select>

              <p className="mt-2 text-xs text-slate-400">
                Hold Ctrl to select multiple datasets.
                Comparison updates automatically.
              </p>

            </div>

            {comparisons.length > 0 ? (
              <>

                {/* COMPARISON CHART */}

                <div className="mb-5 h-[300px] w-full">

                  <ResponsiveContainer width="100%" height="100%">

                    <BarChart data={comparisons}>

                      <CartesianGrid strokeDasharray="3 3" vertical={false} />

                      <XAxis
                        dataKey="dataset_name"
                        tick={{ fontSize: 11 }}
                      />

                      <YAxis domain={[0, 100]} />

                      <Tooltip />

                      <Legend />

                      <Bar
                        dataKey="average_quality_score"
                        name="Average Quality Score"
                        fill="#8b5cf6"
                        radius={[6, 6, 0, 0]}
                      />

                      <Bar
                        dataKey="success_rate"
                        name="Success Rate"
                        fill="#10b981"
                        radius={[6, 6, 0, 0]}
                      />

                    </BarChart>

                  </ResponsiveContainer>

                </div>

                {/* COMPARISON TABLE */}

                <div className="overflow-x-auto">

                  <table className="w-full min-w-[700px] text-left text-sm">

                    <thead className="bg-slate-50 text-xs uppercase text-slate-500">

                      <tr>
                        <th className="p-3">Dataset</th>
                        <th className="p-3">Avg Quality</th>
                        <th className="p-3">Total Runs</th>
                        <th className="p-3">Successful</th>
                        <th className="p-3">Failed</th>
                        <th className="p-3">Validation Failures</th>
                        <th className="p-3">Success Rate</th>
                      </tr>

                    </thead>

                    <tbody>

                      {comparisons.map((item) => (
                        <tr
                          key={item.dataset_id}
                          className="border-b border-slate-100"
                        >
                          <td className="p-3 font-semibold text-slate-700">
                            {item.dataset_name}
                          </td>

                          <td className="p-3">
                            {formatScore(item.average_quality_score)}
                          </td>

                          <td className="p-3">
                            {formatNumber(item.total_processing_runs)}
                          </td>

                          <td className="p-3 text-emerald-600">
                            {formatNumber(item.successful_runs)}
                          </td>

                          <td className="p-3 text-red-500">
                            {formatNumber(item.failed_runs)}
                          </td>

                          <td className="p-3">
                            {formatNumber(item.total_validation_failures)}
                          </td>

                          <td className="p-3 font-semibold">
                            {formatScore(item.success_rate)}
                          </td>
                        </tr>
                      ))}

                    </tbody>

                  </table>

                </div>

              </>
            ) : (
              <EmptyChart message="Select at least two datasets to compare." />
            )}

          </section>

          {/* VALIDATION RULE ANALYTICS */}

          
          {/* VALIDATION RULE ANALYTICS */}

          <section className="rounded-2xl border border-white bg-white p-4 sm:p-5 shadow-sm">
            <div className="mb-5">
              <h3 className="font-bold text-slate-800">
                Validation Rule Performance
              </h3>

              <p className="mt-1 text-xs text-slate-400">
                Frequently failing validation rules and failure percentages
              </p>
            </div>

            {validationPerformance.length > 0 ? (
              <>
                {/* MOBILE CARD VIEW */}

                <div className="space-y-3 md:hidden">
                  {[...validationPerformance]
                    .sort(
                      (a, b) =>
                        b.failure_percentage - a.failure_percentage
                    )
                    .map((rule) => (
                      <div
                        key={`mobile-${rule.rule_id}-${rule.dataset_id}`}
                        className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                      >
                        <div className="mb-3">
                          <h4 className="break-words font-semibold text-slate-800">
                            {rule.rule_name}
                          </h4>

                          <span className="mt-2 inline-block rounded-lg bg-violet-100 px-2 py-1 text-xs font-medium text-violet-700">
                            {rule.rule_type}
                          </span>
                        </div>

                        <div className="mb-3">
                          <p className="text-xs text-slate-500">
                            Dataset
                          </p>
                          <p className="break-words text-sm font-medium text-slate-700">
                            {rule.dataset_name}
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="rounded-lg bg-white p-3">
                            <p className="text-xs text-slate-500">
                              Failure Count
                            </p>
                            <p className="mt-1 font-bold text-red-500">
                              {formatNumber(rule.failure_count)}
                            </p>
                          </div>

                          <div className="rounded-lg bg-white p-3">
                            <p className="text-xs text-slate-500">
                              Total Checked
                            </p>
                            <p className="mt-1 font-bold text-slate-700">
                              {formatNumber(rule.total_checked)}
                            </p>
                          </div>
                        </div>

                        <div className="mt-4">
                          <div className="mb-2 flex items-center justify-between">
                            <span className="text-xs font-medium text-slate-500">
                              Failure Percentage
                            </span>

                            <span className="text-sm font-bold text-slate-800">
                              {formatScore(rule.failure_percentage)}
                            </span>
                          </div>

                          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                            <div
                              className="h-full rounded-full bg-rose-500"
                              style={{
                                width: `${Math.min(
                                  100,
                                  Math.max(0, rule.failure_percentage)
                                )}%`,
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                </div>

                {/* DESKTOP TABLE VIEW */}

                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full min-w-[700px] text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                      <tr>
                        <th className="p-3">Rule Name</th>
                        <th className="p-3">Rule Type</th>
                        <th className="p-3">Dataset</th>
                        <th className="p-3">Failure Count</th>
                        <th className="p-3">Total Checked</th>
                        <th className="p-3">Failure Percentage</th>
                      </tr>
                    </thead>

                    <tbody>
                      {[...validationPerformance]
                        .sort(
                          (a, b) =>
                            b.failure_percentage - a.failure_percentage
                        )
                        .map((rule) => (
                          <tr
                            key={`desktop-${rule.rule_id}-${rule.dataset_id}`}
                            className="border-b border-slate-100 hover:bg-slate-50"
                          >
                            <td className="p-3 font-semibold text-slate-700">
                              {rule.rule_name}
                            </td>

                            <td className="p-3">
                              <span className="rounded-lg bg-violet-50 px-2 py-1 text-xs font-medium text-violet-700">
                                {rule.rule_type}
                              </span>
                            </td>

                            <td className="p-3">
                              {rule.dataset_name}
                            </td>

                            <td className="p-3 font-semibold text-red-500">
                              {formatNumber(rule.failure_count)}
                            </td>

                            <td className="p-3">
                              {formatNumber(rule.total_checked)}
                            </td>

                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                <div className="h-2 w-20 overflow-hidden rounded-full bg-slate-100">
                                  <div
                                    className="h-full rounded-full bg-rose-500"
                                    style={{
                                      width: `${Math.min(
                                        100,
                                        Math.max(0, rule.failure_percentage)
                                      )}%`,
                                    }}
                                  />
                                </div>

                                <span className="font-semibold text-slate-700">
                                  {formatScore(rule.failure_percentage)}
                                </span>
                              </div>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <EmptyChart message="No validation performance data available." />
            )}
          </section>


        </>
      )}

    </div>
  );
}

// ==============================
// EMPTY CHART COMPONENT
// ==============================

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex h-full min-h-40 items-center justify-center rounded-xl bg-slate-50 px-4 text-center text-sm text-slate-400">
      {message}
    </div>
  );
}
