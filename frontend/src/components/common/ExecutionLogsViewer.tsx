
import { useCallback, useEffect, useState } from "react";

import {
  getProcessingRunLogs,
  type ExecutionLog,
  type ExecutionLogLevel,
} from "../../services/api";

const LOG_LEVELS: ExecutionLogLevel[] = [
  "INFO",
  "WARNING",
  "ERROR",
  "DEBUG",
];

interface ExecutionLogsViewerProps {
  runId: number;
}

const LEVEL_STYLES: Record<ExecutionLogLevel, string> = {
  INFO: "bg-blue-100 text-blue-700",
  WARNING: "bg-amber-100 text-amber-700",
  ERROR: "bg-red-100 text-red-700",
  DEBUG: "bg-slate-100 text-slate-700",
};

export default function ExecutionLogsViewer({
  runId,
}: ExecutionLogsViewerProps) {
  const [logs, setLogs] = useState<ExecutionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [level, setLevel] = useState("");
  const [search, setSearch] = useState("");

  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const pageSize = 10;

  const loadLogs = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await getProcessingRunLogs(runId, {
        page,
        page_size: pageSize,
        level: level
          ? (level as ExecutionLogLevel)
          : undefined,
        search: search.trim() || undefined,
      });

      setLogs(response.items);
      setTotal(response.total);
      setTotalPages(response.total_pages);
    } catch (err) {
      console.error("Failed to load execution logs:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load execution logs.",
      );
    } finally {
      setLoading(false);
    }
  }, [runId, page, level, search]);

  useEffect(() => {
    void loadLogs();
  }, [loadLogs]);

  function getDate(value: string) {
    const date = new Date(value);

    return Number.isNaN(date.getTime())
      ? value
      : date.toLocaleString();
  }

  return (
    <section className="mt-6 space-y-4 border-t border-slate-200 pt-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-900">
            Execution Logs
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Run ID: {runId} · Total logs: {total}
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadLogs()}
          disabled={loading}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label
            htmlFor="execution-log-search"
            className="mb-1 block text-sm font-medium text-slate-700"
          >
            Search logs
          </label>

          <input
            id="execution-log-search"
            type="text"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Search message or stage..."
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
          />
        </div>

        <div>
          <label
            htmlFor="execution-log-level"
            className="mb-1 block text-sm font-medium text-slate-700"
          >
            Filter by level
          </label>

          <select
            id="execution-log-level"
            value={level}
            onChange={(event) => {
              setLevel(event.target.value);
              setPage(1);
            }}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
          >
            <option value="">All Levels</option>

            {LOG_LEVELS.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="py-8 text-center text-sm text-slate-500">
          Loading execution logs...
        </div>
      ) : error ? (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          {error}
          <button
            type="button"
            onClick={() => void loadLogs()}
            className="ml-2 font-semibold underline"
          >
            Retry
          </button>
        </div>
      ) : logs.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-6 text-center">
          <p className="font-medium text-slate-700">
            No execution logs found
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Try changing the search or level filter.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {logs.map((log) => (
            <article
              key={log.id}
              className="rounded-lg border border-slate-200 bg-white p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${LEVEL_STYLES[log.level]}`}
                >
                  {log.level}
                </span>

                <span className="text-xs text-slate-500">
                  {getDate(log.timestamp)}
                </span>
              </div>

              <p className="mt-3 text-sm font-semibold text-slate-800">
                {log.stage}
              </p>

              <p className="mt-1 break-words text-sm text-slate-600">
                {log.message}
              </p>

              <p className="mt-2 text-xs text-slate-400">
                Log ID: {log.id} · Dataset ID: {log.dataset_id}
              </p>
            </article>
          ))}
        </div>
      )}

      {!loading && totalPages > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-500">
            Page {page} of {totalPages}
          </p>

          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((current) => current - 1)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:opacity-40"
            >
              Previous
            </button>

            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((current) => current + 1)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
