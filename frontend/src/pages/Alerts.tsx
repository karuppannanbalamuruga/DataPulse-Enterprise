
import { useCallback, useEffect, useState } from "react";

import {
  AlertTriangle,
  CheckCircle,
  Clock,
  RefreshCw,
  ShieldAlert,
} from "lucide-react";

import Toast, { type ToastType } from "../components/common/Toast";

import {
  getAlerts,
  acknowledgeAlert,
  resolveAlert,
} from "../services/api";

import type { Alert } from "../types/alertNotification";

export default function Alerts() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const [status, setStatus] = useState("");
  const [severity, setSeverity] = useState("");

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // TOAST STATE
  const [toast, setToast] = useState<{
    message: string;
    type: ToastType;
  }>({
    message: "",
    type: "success",
  });

  // SHOW TOAST
  const showToast = (
    message: string,
    type: ToastType = "success",
  ) => {
    setToast({ message, type });
  };

  // CLOSE TOAST
  const closeToast = () => {
    setToast((current) => ({
      ...current,
      message: "",
    }));
  };

  // FETCH ALERTS
  // showLoader=false means refresh data without hiding existing cards.
  const fetchAlerts = useCallback(async (showLoader = true) => {
    try {
      if (showLoader) {
        setLoading(true);
      }

      const response = await getAlerts({
        page,
        page_size: 10,
        ...(status ? { status } : {}),
        ...(severity ? { severity } : {}),
      });

      setAlerts(response.items);
      setTotal(response.total);
      setTotalPages(response.total_pages);
    } catch (err) {
      console.error("Failed to fetch alerts:", err);

      showToast(
        "Unable to load alerts. Please try again.",
        "error",
      );
    } finally {
      if (showLoader) {
        setLoading(false);
      }
    }
  }, [page, status, severity]);

  // INITIAL FETCH AND FILTER/PAGE CHANGES
  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  // ACKNOWLEDGE / RESOLVE ALERT
  const handleAlertAction = async (
    alertId: number,
    action: "acknowledge" | "resolve",
  ) => {
    try {
      setActionLoading(alertId);

      if (action === "acknowledge") {
        await acknowledgeAlert(alertId);

        showToast(
          `Alert #${alertId} acknowledged successfully.`,
          "success",
        );
      } else {
        await resolveAlert(alertId);

        showToast(
          `Alert #${alertId} resolved successfully.`,
          "success",
        );
      }

      // IMPORTANT:
      // Refresh data without setting loading=true.
      // Existing cards remain visible and scroll position is preserved.
      await fetchAlerts(false);
    } catch (err) {
      console.error("Alert action failed:", err);

      showToast(
        `Unable to ${action} this alert. Please try again.`,
        "error",
      );
    } finally {
      setActionLoading(null);
    }
  };

  // SEVERITY STYLE
  const getSeverityStyle = (value: string) => {
    switch (value.toLowerCase()) {
      case "critical":
        return "bg-red-100 text-red-700 border border-red-200";

      case "high":
        return "bg-orange-100 text-orange-700 border border-orange-200";

      case "medium":
        return "bg-yellow-100 text-yellow-700 border border-yellow-200";

      case "warning":
        return "bg-amber-100 text-amber-700 border border-amber-200";

      case "low":
        return "bg-blue-100 text-blue-700 border border-blue-200";

      default:
        return "bg-slate-100 text-slate-700 border border-slate-200";
    }
  };

  // STATUS STYLE
  const getStatusStyle = (value: string) => {
    switch (value.toLowerCase()) {
      case "open":
        return "bg-red-100 text-red-700 border border-red-200";

      case "acknowledged":
        return "bg-blue-100 text-blue-700 border border-blue-200";

      case "resolved":
        return "bg-emerald-100 text-emerald-700 border border-emerald-200";

      default:
        return "bg-slate-100 text-slate-700 border border-slate-200";
    }
  };

  // DATE FORMAT
  const formatDate = (value: string) => {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "Invalid date";
    }

    return date.toLocaleString();
  };

  return (
    <div className="space-y-5 p-4 sm:p-5 md:p-6">

      {/* TOAST NOTIFICATION */}
      <Toast
        message={toast.message}
        type={toast.type}
        duration={4000}
        onClose={closeToast}
      />

      {/* PAGE HEADING */}
      <div>
        <h1 className="text-xl font-extrabold tracking-tight text-slate-900">
          Alert Monitoring
        </h1>

        <p className="mt-1 text-xs text-slate-500">
          Monitor and manage your data quality alerts.
        </p>
      </div>

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">

        {/* TOTAL ALERTS */}
        <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500">
              Total Alerts
            </p>

            <div className="rounded-lg bg-violet-50 p-2 text-violet-600">
              <ShieldAlert size={18} />
            </div>
          </div>

          <h2 className="mt-2 text-2xl font-extrabold text-slate-900">
            {total}
          </h2>

          <p className="mt-1 text-[11px] text-slate-400">
            Total matching alerts
          </p>
        </div>

        {/* OPEN ALERTS */}
        <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500">
              Open Alerts
            </p>

            <div className="rounded-lg bg-red-50 p-2 text-red-600">
              <AlertTriangle size={18} />
            </div>
          </div>

          <h2 className="mt-2 text-2xl font-extrabold text-slate-900">
            {
              alerts.filter(
                (item) => item.status.toLowerCase() === "open",
              ).length
            }
          </h2>

          <p className="mt-1 text-[11px] text-slate-400">
            Open alerts on this page
          </p>
        </div>

        {/* RESOLVED ALERTS */}
        <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500">
              Resolved Alerts
            </p>

            <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600">
              <CheckCircle size={18} />
            </div>
          </div>

          <h2 className="mt-2 text-2xl font-extrabold text-slate-900">
            {
              alerts.filter(
                (item) => item.status.toLowerCase() === "resolved",
              ).length
            }
          </h2>

          <p className="mt-1 text-[11px] text-slate-400">
            Resolved alerts on this page
          </p>
        </div>
      </div>

      {/* FILTER SECTION */}
      <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">

        <div className="mb-3">
          <h2 className="text-sm font-bold text-slate-800">
            Filter Alerts
          </h2>

          <p className="mt-1 text-[11px] text-slate-400">
            Filter alerts by status and severity.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">

          {/* STATUS FILTER */}
          <select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
            className="min-w-[160px] rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 outline-none transition focus:border-violet-400 focus:bg-white focus:ring-2 focus:ring-violet-100"
          >
            <option value="">All Statuses</option>
            <option value="open">Open</option>
            <option value="acknowledged">Acknowledged</option>
            <option value="resolved">Resolved</option>
          </select>

          {/* SEVERITY FILTER */}
          <select
            value={severity}
            onChange={(event) => {
              setSeverity(event.target.value);
              setPage(1);
            }}
            className="min-w-[160px] rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 outline-none transition focus:border-violet-400 focus:bg-white focus:ring-2 focus:ring-violet-100"
          >
            <option value="">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="warning">Warning</option>
            <option value="low">Low</option>
          </select>

        </div>
      </div>

      {/* ALERTS SECTION */}
      <div>

        {/* SECTION HEADING */}
        <div className="mb-3 flex items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-extrabold text-slate-800">
              Alerts List
            </h2>

            <p className="mt-1 text-[11px] text-slate-500">
              Review alert details and take necessary actions.
            </p>
          </div>

          <span className="shrink-0 rounded-full bg-violet-50 px-3 py-1 text-[11px] font-bold text-violet-700">
            {total} Alerts
          </span>
        </div>

        {/* LOADING */}
        {loading ? (
          <div className="rounded-xl border border-slate-100 bg-white py-12 text-center shadow-sm">
            <RefreshCw
              size={24}
              className="mx-auto animate-spin text-violet-500"
            />

            <p className="mt-2 text-xs font-medium text-slate-500">
              Loading alerts...
            </p>
          </div>
        ) : alerts.length === 0 ? (
          /* EMPTY STATE */
          <div className="rounded-xl border border-slate-100 bg-white py-12 text-center shadow-sm">
            <CheckCircle
              className="mx-auto text-emerald-500"
              size={34}
            />

            <h3 className="mt-2 text-sm font-bold text-slate-800">
              No Alerts Found
            </h3>

            <p className="mt-1 text-xs text-slate-500">
              No alerts match the selected filters.
            </p>
          </div>
        ) : (
          /* COMPACT ALERT CARDS */
          <div className="grid grid-cols-1 gap-3">
            {alerts.map((alert) => {
              const currentStatus = alert.status.toLowerCase();
              const isBusy = actionLoading === alert.id;

              return (
                <div
                  key={alert.id}
                  className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-violet-200 hover:shadow-md"
                >
                  {/* CARD HEADER */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="shrink-0 rounded-lg bg-red-50 p-2 text-red-500">
                        <AlertTriangle size={18} />
                      </div>

                      <div className="min-w-0">
                        <h3 className="break-words text-sm font-bold text-slate-800">
                          {alert.title}
                        </h3>

                        <p className="mt-0.5 text-xs text-slate-400">
                          Alert ID #{alert.id}
                        </p>
                      </div>
                    </div>

                    {/* BADGES */}
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span
                        className={`rounded-full px-2.5 py-1 text-[10px] font-bold capitalize ${getSeverityStyle(alert.severity)}`}
                      >
                        {alert.severity}
                      </span>

                      <span
                        className={`rounded-full px-2.5 py-1 text-[10px] font-bold capitalize ${getStatusStyle(alert.status)}`}
                      >
                        {alert.status}
                      </span>
                    </div>
                  </div>

                  {/* DESCRIPTION */}
                  <p className="mt-2 text-xs leading-5 text-slate-600">
                    {alert.description}
                  </p>

                  {/* ALERT DETAILS */}
                  <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 rounded-lg bg-slate-50 p-3 sm:grid-cols-4">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                        Dataset ID
                      </p>

                      <p className="mt-0.5 text-xs font-bold text-slate-700">
                        #{alert.dataset_id}
                      </p>
                    </div>

                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                        Rule ID
                      </p>

                      <p className="mt-0.5 text-xs font-bold text-slate-700">
                        #{alert.alert_rule_id}
                      </p>
                    </div>

                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                        Processing Run
                      </p>

                      <p className="mt-0.5 text-xs font-bold text-slate-700">
                        {alert.processing_run_id ?? "N/A"}
                      </p>
                    </div>

                    <div>
                      <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                        <Clock size={11} />
                        Triggered At
                      </p>

                      <p className="mt-0.5 text-xs font-semibold text-slate-700">
                        {formatDate(alert.triggered_at)}
                      </p>
                    </div>
                  </div>

                  {/* ACTION BUTTONS */}
                  {(currentStatus === "open" ||
                    currentStatus === "acknowledged") && (
                    <div className="mt-3 flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-3">
                      {currentStatus === "open" && (
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() =>
                            handleAlertAction(alert.id, "acknowledge")
                          }
                          className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {isBusy ? "Processing..." : "Acknowledge"}
                        </button>
                      )}

                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() =>
                          handleAlertAction(alert.id, "resolve")
                        }
                        className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isBusy ? "Processing..." : "Resolve Alert"}
                      </button>
                    </div>
                  )}

                  {/* RESOLVED STATUS */}
                  {currentStatus === "resolved" && (
                    <div className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-3 text-xs font-semibold text-emerald-600">
                      <CheckCircle size={14} />
                      This alert has been resolved.
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* PAGINATION */}
      {!loading && totalPages > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 bg-white px-4 py-3 shadow-sm">
          <p className="text-xs font-medium text-slate-500">
            Page {page} of {totalPages} · {total} alerts
          </p>

          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((current) => current - 1)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Previous
            </button>

            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((current) => current + 1)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
