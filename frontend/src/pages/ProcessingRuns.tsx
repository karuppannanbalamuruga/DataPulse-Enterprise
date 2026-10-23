import { useCallback, useEffect, useState, type FormEvent } from "react";

import PageContainer from "../components/layout/PageContainer";
import Button from "../components/common/Button";
import Loader from "../components/common/Loader";
import EmptyState from "../components/common/EmptyState";
import Badge from "../components/common/Badge";
import Modal from "../components/common/Model";
import Toast from "../components/common/Toast";

import {
  getProcessingRuns,
  getDatasets,
  getProcessingRun,
  createProcessingRun,
  updateProcessingRun,
} from "../services/api";

import type {
  ProcessingRun,
  ProcessingRunStatus,
} from "../types/processingRun";
import type { Dataset } from "../types/dataset";

const PAGE_SIZE = 10;

const RUN_STATUSES: ProcessingRunStatus[] = [
  "pending",
  "processing",
  "completed",
  "failed",
];

export default function ProcessingRuns() {
  const [runs, setRuns] = useState<ProcessingRun[]>([]);
  const [datasets, setDatasets] = useState<Dataset[]>([]);

  const [loading, setLoading] = useState(true);
  const [datasetsLoading, setDatasetsLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [viewLoading, setViewLoading] = useState(false);

  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [editFormError, setEditFormError] = useState("");

  // Status filter
  const [statusFilter, setStatusFilter] = useState("");

  // Pagination
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Create modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedDatasetId, setSelectedDatasetId] = useState("");

  // View modal
  const [viewRun, setViewRun] = useState<ProcessingRun | null>(null);

  // Edit modal
  const [editingRun, setEditingRun] = useState<ProcessingRun | null>(null);
  const [editStatus, setEditStatus] =
    useState<ProcessingRunStatus>("pending");
  const [editRecordsProcessed, setEditRecordsProcessed] = useState("0");
  const [editErrorMessage, setEditErrorMessage] = useState("");

  // Toast
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] =
    useState<"success" | "error">("success");

  function showToast(
    message: string,
    type: "success" | "error" = "success",
  ) {
    setToastType(type);
    setToastMessage(message);
  }

  function getApiErrorMessage(err: unknown): string {
    if (
      typeof err === "object" &&
      err !== null &&
      "response" in err
    ) {
      const response = err.response;

      if (
        typeof response === "object" &&
        response !== null &&
        "data" in response
      ) {
        const data = response.data;

        if (
          typeof data === "object" &&
          data !== null &&
          "detail" in data
        ) {
          const detail = data.detail;

          if (typeof detail === "string") return detail;

          if (Array.isArray(detail)) {
            return detail
              .map((item) =>
                typeof item === "object" &&
                item !== null &&
                "msg" in item
                  ? String(item.msg)
                  : String(item),
              )
              .join(", ");
          }
        }
      }
    }

    return err instanceof Error
      ? err.message
      : "Request failed. Please check the backend and try again.";
  }

  // Fetch processing runs using server-side pagination and filters.
  const loadProcessingRuns = useCallback(
    async (pageNumber = page) => {
      try {
        setLoading(true);
        setError("");

        const response = await getProcessingRuns({
          page: pageNumber,
          page_size: PAGE_SIZE,
          status: statusFilter
            ? (statusFilter as ProcessingRunStatus)
            : undefined,
        });

        setRuns(response.items);
        setTotal(response.total);
        setTotalPages(response.total_pages);

        // Avoid setting page outside the valid range after filtering/deleting.
        const validPage = Math.max(1, response.total_pages
          ? Math.min(pageNumber, response.total_pages)
          : 1);
        if (response.page !== validPage) {
          setPage(validPage);
        }
      } catch (err) {
        console.error("Failed to load processing runs:", err);
        setError(getApiErrorMessage(err));
      } finally {
        setLoading(false);
      }
    },
    [page, statusFilter],
  );

  const loadDatasets = useCallback(async () => {
    try {
      setDatasetsLoading(true);
      setFormError("");

      const response = await getDatasets({
        page: 1,
        page_size: 100,
      });

      setDatasets(response.items);
    } catch (err) {
      console.error("Failed to load datasets:", err);
      setFormError(getApiErrorMessage(err));
    } finally {
      setDatasetsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProcessingRuns(page);
  }, [page, loadProcessingRuns]);

  async function handleViewRun(run: ProcessingRun) {
    setViewRun(run);
    setViewLoading(true);

    try {
      const details = await getProcessingRun(run.id);
      setViewRun(details);
    } catch (err) {
      console.error("Failed to load processing run:", err);
      showToast(getApiErrorMessage(err), "error");
      setViewRun(null);
    } finally {
      setViewLoading(false);
    }
  }

  async function openCreateModal() {
    setSelectedDatasetId("");
    setFormError("");
    setIsCreateOpen(true);
    await loadDatasets();
  }

  async function handleCreateRun() {
    if (!selectedDatasetId) {
      setFormError("Please select a dataset.");
      return;
    }

    try {
      setCreating(true);
      setFormError("");

      await createProcessingRun(Number(selectedDatasetId));

      setIsCreateOpen(false);
      setSelectedDatasetId("");
      showToast("Processing run created successfully.", "success");

      // A new run may not be on the current page; return to page one.
      if (page !== 1) {
        setPage(1);
      } else {
        await loadProcessingRuns(1);
      }
    } catch (err) {
      console.error("Failed to create processing run:", err);
      showToast(getApiErrorMessage(err), "error");
    } finally {
      setCreating(false);
    }
  }

  function handleEditRun(run: ProcessingRun) {
    setEditingRun(run);
    setEditStatus(run.status);
    setEditRecordsProcessed(String(run.records_processed ?? 0));
    setEditErrorMessage(run.error_message ?? "");
    setEditFormError("");
  }

  function closeEditModal() {
    if (updating) return;
    setEditingRun(null);
    setEditFormError("");
  }

  async function handleUpdateRun(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingRun) return;

    const recordsProcessed = Number(editRecordsProcessed);

    if (
      editRecordsProcessed.trim() === "" ||
      !Number.isInteger(recordsProcessed) ||
      recordsProcessed < 0
    ) {
      setEditFormError(
        "Records Processed must be a non-negative whole number.",
      );
      return;
    }

    try {
      setUpdating(true);
      setEditFormError("");

      await updateProcessingRun(editingRun.id, {
        status: editStatus,
        records_processed: recordsProcessed,
        error_message: editErrorMessage.trim() || null,
      });

      setEditingRun(null);
      showToast("Processing run updated successfully.", "success");
      await loadProcessingRuns(page);
    } catch (err) {
      console.error("Failed to update processing run:", err);
      showToast(getApiErrorMessage(err), "error");
    } finally {
      setUpdating(false);
    }
  }

  function getStatus(status: string) {
    switch (status.toLowerCase()) {
      case "completed":
        return "success" as const;
      case "failed":
        return "error" as const;
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
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
  }

  const firstRecord = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const lastRecord = Math.min(page * PAGE_SIZE, total);

  return (
    <PageContainer>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            Processing Runs
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Monitor and manage dataset processing history.
          </p>
        </div>

        <Button onClick={() => void openCreateModal()} disabled={creating}>
          Create Processing Run
        </Button>
      </div>

      <Toast
        message={toastMessage}
        type={toastType}
        duration={5000}
        onClose={() => setToastMessage("")}
      />

      {/* Search and status filter */}
      <div className="mb-5 rounded-xl border border-slate-200 bg-white p-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label
              htmlFor="processing-run-status-filter"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Filter by Status
            </label>
            <select
              id="processing-run-status-filter"
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value);
                setPage(1);
              }}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="">All Statuses</option>
              {RUN_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <Loader message="Loading processing runs..." />
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-white p-6">
          <p role="alert" className="text-sm text-red-600">{error}</p>
          <Button
            className="mt-4"
            onClick={() => void loadProcessingRuns(page)}
          >
            Try Again
          </Button>
        </div>
      ) : runs.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white">
          <EmptyState
            title="No processing runs found"
            description={
              statusFilter
                ? "Try changing your search or clearing the filters."
                : "Create a processing run to get started."
            }
          />
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-5 py-4 font-medium">Run ID</th>
                  <th className="px-5 py-4 font-medium">Dataset ID</th>
                  <th className="px-5 py-4 font-medium">Status</th>
                  <th className="px-5 py-4 font-medium">Records Processed</th>
                  <th className="px-5 py-4 font-medium">Started At</th>
                  <th className="px-5 py-4 font-medium">Completed At</th>
                  <th className="px-5 py-4 text-center font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((run) => (
                  <tr
                    key={run.id}
                    className="border-t border-slate-100 hover:bg-slate-50"
                  >
                    <td className="px-5 py-4 font-medium text-slate-900">
                      {run.id}
                    </td>
                    <td className="px-5 py-4">{run.dataset_id}</td>
                    <td className="px-5 py-4">
                      <Badge status={getStatus(run.status)}>{run.status}</Badge>
                    </td>
                    <td className="px-5 py-4">{run.records_processed ?? 0}</td>
                    <td className="px-5 py-4">{formatDate(run.started_at)}</td>
                    <td className="px-5 py-4">{formatDate(run.completed_at)}</td>
                    <td className="px-5 py-4">
                      <div className="flex justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => void handleViewRun(run)}
                          aria-label={`View run ${run.id}`}
                          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-blue-700 hover:bg-blue-50"
                        >
                          View
                        </button>
                        <button
                          type="button"
                          onClick={() => handleEditRun(run)}
                          aria-label={`Edit run ${run.id}`}
                          disabled={run.status.toLowerCase() === "completed"}
                          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Edit
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-500">
              Showing {firstRecord}–{lastRecord} of {total} records
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                disabled={page <= 1 || loading}
                onClick={() => setPage((current) => current - 1)}
              >
                Previous
              </Button>
              <span className="px-3 text-sm text-slate-700">
                Page {page} of {Math.max(totalPages, 1)}
              </span>
              <Button
                variant="secondary"
                disabled={page >= totalPages || loading || totalPages === 0}
                onClick={() => setPage((current) => current + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}

      {/* Create modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => {
          if (!creating) setIsCreateOpen(false);
        }}
        title="Create Processing Run"
        description="Select a dataset for processing."
        size="lg"
      >
        <div className="space-y-5">
          <div>
            <label
              htmlFor="dataset"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Select Dataset
            </label>
            <select
              id="dataset"
              value={selectedDatasetId}
              onChange={(event) => {
                setSelectedDatasetId(event.target.value);
                setFormError("");
              }}
              disabled={datasetsLoading || creating}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm"
            >
              <option value="">
                {datasetsLoading ? "Loading datasets..." : "Choose a dataset"}
              </option>
              {datasets.map((dataset) => (
                <option key={dataset.id} value={dataset.id}>
                  {dataset.name} (ID: {dataset.id})
                </option>
              ))}
            </select>
          </div>

          {formError && (
            <p role="alert" className="text-sm text-red-600">{formError}</p>
          )}
          {!datasetsLoading && datasets.length === 0 && !formError && (
            <p className="text-sm text-amber-700">
              No datasets are available. Create a dataset first.
            </p>
          )}

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="secondary"
              disabled={creating}
              onClick={() => setIsCreateOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => void handleCreateRun()}
              loading={creating}
              disabled={creating || datasetsLoading || datasets.length === 0}
            >
              {creating ? "Creating..." : "Create Run"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* View modal */}
      <Modal
        isOpen={viewRun !== null}
        onClose={() => {
          if (!viewLoading) setViewRun(null);
        }}
        title="Processing Run Details"
        description="View processing run information."
        size="lg"
      >
        {viewLoading ? (
          <Loader message="Loading run details..." />
        ) : viewRun ? (
          <div className="space-y-4">
            <Detail label="Run ID" value={viewRun.id} />
            <Detail label="Dataset ID" value={viewRun.dataset_id} />
            <Detail label="Status" value={viewRun.status} />
            <Detail
              label="Records Processed"
              value={viewRun.records_processed ?? 0}
            />
            <Detail label="Started At" value={formatDate(viewRun.started_at)} />
            <Detail
              label="Completed At"
              value={formatDate(viewRun.completed_at)}
            />
            <Detail
              label="Error Message"
              value={viewRun.error_message || "—"}
            />
            <div className="flex justify-end pt-3">
              <Button variant="secondary" onClick={() => setViewRun(null)}>
                Close
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>

      {/* Edit modal */}
      <Modal
        isOpen={editingRun !== null}
        onClose={closeEditModal}
        title="Edit Processing Run"
        description="Update the processing status and execution details."
        size="lg"
      >
        <form onSubmit={handleUpdateRun} className="space-y-5">
          <Detail label="Run ID" value={editingRun?.id ?? "—"} />
          <Detail label="Dataset ID" value={editingRun?.dataset_id ?? "—"} />

          <div>
            <label
              htmlFor="edit-run-status"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Status
            </label>
            <select
              id="edit-run-status"
              value={editStatus}
              onChange={(event) =>
                setEditStatus(event.target.value as ProcessingRunStatus)
              }
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm"
            >
              {RUN_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="edit-records-processed"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Records Processed
            </label>
            <input
              id="edit-records-processed"
              type="number"
              min="0"
              step="1"
              required
              value={editRecordsProcessed}
              onChange={(event) => setEditRecordsProcessed(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
            />
          </div>

          <div>
            <label
              htmlFor="edit-run-error"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Error Message
            </label>
            <textarea
              id="edit-run-error"
              rows={3}
              value={editErrorMessage}
              onChange={(event) => setEditErrorMessage(event.target.value)}
              placeholder="Enter error details, if any"
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
            />
          </div>

          {editFormError && (
            <p role="alert" className="text-sm text-red-600">{editFormError}</p>
          )}

          <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={closeEditModal}
              disabled={updating}
            >
              Cancel
            </Button>
            <Button type="submit" loading={updating} disabled={updating}>
              {updating ? "Updating..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </Modal>
    </PageContainer>
  );
}

function Detail({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="grid grid-cols-1 gap-1 border-b border-slate-100 pb-3 sm:grid-cols-3">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="break-words text-sm font-medium text-slate-800 sm:col-span-2">
        {value}
      </p>
    </div>
  );
}
