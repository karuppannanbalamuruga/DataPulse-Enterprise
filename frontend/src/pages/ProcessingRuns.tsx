
import { useCallback, useEffect, useState, type FormEvent } from "react";

import PageContainer from "../components/layout/PageContainer";
import Button from "../components/common/Button";
import Loader from "../components/common/Loader";
import EmptyState from "../components/common/EmptyState";
import Badge from "../components/common/Badge";
import Modal from "../components/common/Model";

import {
  getProcessingRuns,
  getDatasets,
  createProcessingRun,
  updateProcessingRun,
} from "../services/api";

import type { ProcessingRun } from "../types/processingRun";
import type { Dataset } from "../types/dataset";

const RUN_STATUSES = ["pending", "running", "completed", "failed"];

export default function ProcessingRuns() {
  const [runs, setRuns] = useState<ProcessingRun[]>([]);
  const [datasets, setDatasets] = useState<Dataset[]>([]);

  const [loading, setLoading] = useState(true);
  const [datasetsLoading, setDatasetsLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);

  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Create modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDatasetId, setSelectedDatasetId] = useState("");

  // Edit modal state
  const [editingRun, setEditingRun] = useState<ProcessingRun | null>(null);
  const [editStatus, setEditStatus] = useState("pending");
  const [editRecordsProcessed, setEditRecordsProcessed] = useState("0");
  const [editErrorMessage, setEditErrorMessage] = useState("");
  const [editFormError, setEditFormError] = useState("");

  // Load processing runs
  const loadProcessingRuns = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const data = await getProcessingRuns();
      setRuns(data);
    } catch (err) {
      console.error("Failed to load processing runs:", err);
      setError("Unable to load processing runs. Check the backend server.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Load datasets for the dropdown
  const loadDatasets = useCallback(async () => {
    try {
      setDatasetsLoading(true);
      setFormError("");

      const data = await getDatasets();
      setDatasets(data.items);
    } catch (err) {
      console.error("Failed to load datasets:", err);
      setFormError("Unable to load datasets. Please try again.");
    } finally {
      setDatasetsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProcessingRuns();
  }, [loadProcessingRuns]);

  // Open create modal
  async function openCreateModal() {
    setSelectedDatasetId("");
    setFormError("");
    setSuccessMessage("");
    setIsModalOpen(true);

    await loadDatasets();
  }

  // Create processing run
  async function handleCreateRun() {
    if (!selectedDatasetId) {
      setFormError("Please select a dataset.");
      return;
    }

    try {
      setCreating(true);
      setFormError("");
      setSuccessMessage("");

      await createProcessingRun(Number(selectedDatasetId));

      setIsModalOpen(false);
      setSelectedDatasetId("");
      setSuccessMessage("Processing run created successfully.");

      await loadProcessingRuns();
    } catch (err: unknown) {
      console.error("Failed to create processing run:", err);
      setFormError(getApiErrorMessage(err));
    } finally {
      setCreating(false);
    }
  }

  // Open edit modal and populate the selected run
  function openEditModal(run: ProcessingRun) {
    setEditingRun(run);
    setEditStatus(run.status.toLowerCase());
    setEditRecordsProcessed(String(run.records_processed ?? 0));
    setEditErrorMessage(run.error_message ?? "");
    setEditFormError("");
    setSuccessMessage("");
  }

  // Close edit modal
  function closeEditModal() {
    if (updating) return;

    setEditingRun(null);
    setEditFormError("");
  }

  // Update processing run through the API
  async function handleUpdateRun(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!editingRun) return;

    setEditFormError("");
    setSuccessMessage("");

    const recordsProcessed = Number(editRecordsProcessed);

    if (
      editRecordsProcessed.trim() === "" ||
      !Number.isInteger(recordsProcessed) ||
      recordsProcessed < 0
    ) {
      setEditFormError(
        "Records Processed must be a non-negative whole number."
      );
      return;
    }

    if (!RUN_STATUSES.includes(editStatus)) {
      setEditFormError("Please select a valid processing status.");
      return;
    }

    try {
      setUpdating(true);

      await updateProcessingRun(editingRun.id, {
        status: editStatus,
        records_processed: recordsProcessed,
        error_message: editErrorMessage.trim() || null,
      });

      setEditingRun(null);
      setSuccessMessage("Processing run updated successfully.");

      await loadProcessingRuns();
    } catch (err: unknown) {
      console.error("Failed to update processing run:", err);
      setEditFormError(getApiErrorMessage(err));
    } finally {
      setUpdating(false);
    }
  }

  // Extract an API error message when available
  function getApiErrorMessage(err: unknown): string {
    if (typeof err === "object" && err !== null && "response" in err) {
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
                  : String(item)
              )
              .join(", ");
          }
        }
      }
    }

    return "The request failed. Please check the details and try again.";
  }

  // Status badge
  function getStatus(status: string) {
    switch (status.toLowerCase()) {
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

  // Format date values
  function formatDate(value?: string | null) {
    if (!value) return "—";

    const date = new Date(value);

    return Number.isNaN(date.getTime())
      ? value
      : date.toLocaleString();
  }

  return (
    <PageContainer>
      {/* Page Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            Processing Runs
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Monitor dataset processing history and execution status.
          </p>
        </div>

        <Button
          onClick={() => void openCreateModal()}
          disabled={creating}
        >
          Create Processing Run
        </Button>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div
          role="status"
          className="mb-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700"
        >
          {successMessage}
        </div>
      )}

      {/* Processing Runs Table */}
      {loading ? (
        <Loader message="Loading processing runs..." />
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-white p-6">
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>

          <Button
            className="mt-4"
            onClick={() => void loadProcessingRuns()}
          >
            Try Again
          </Button>
        </div>
      ) : runs.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white">
          <EmptyState
            title="No processing runs found"
            description="Create a processing run to start recording processing history."
          />
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-5 py-4 font-medium">Run ID</th>
                <th className="px-5 py-4 font-medium">Dataset ID</th>
                <th className="px-5 py-4 font-medium">Status</th>
                <th className="px-5 py-4 font-medium">
                  Records Processed
                </th>
                <th className="px-5 py-4 font-medium">Started At</th>
                <th className="px-5 py-4 font-medium">Completed At</th>
                <th className="px-5 py-4 font-medium">Error</th>
                <th className="px-5 py-4 text-center font-medium">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {runs.map((run) => (
                <tr
                  key={run.id}
                  className="border-t border-slate-100 hover:bg-slate-50"
                >
                  <td className="px-5 py-4 font-medium text-slate-800">
                    {run.id}
                  </td>

                  <td className="px-5 py-4">
                    {run.dataset_id}
                  </td>

                  <td className="px-5 py-4">
                    <Badge status={getStatus(run.status)}>
                      {run.status}
                    </Badge>
                  </td>

                  <td className="px-5 py-4">
                    {run.records_processed ?? 0}
                  </td>

                  <td className="px-5 py-4">
                    {formatDate(run.started_at)}
                  </td>

                  <td className="px-5 py-4">
                    {formatDate(run.completed_at)}
                  </td>

                  <td className="max-w-xs px-5 py-4 text-red-600">
                    {run.error_message || "—"}
                  </td>

                  <td className="px-5 py-4 text-center">
                    <button
                      type="button"
                      onClick={() => openEditModal(run)}
                      title="Edit processing run"
                      aria-label={`Edit processing run ${run.id}`}
                      className="inline-flex items-center justify-center rounded-lg border border-blue-200 bg-blue-50 p-2 text-blue-700 transition hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-300"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M12 20h9" />
                        <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Processing Run Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          if (!creating) setIsModalOpen(false);
        }}
        title="Create Processing Run"
        description="Select a dataset to create a new processing run."
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
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
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

            {!datasetsLoading && datasets.length === 0 && (
              <p className="mt-2 text-sm text-amber-600">
                No datasets available. Please create a dataset first.
              </p>
            )}
          </div>

          {formError && (
            <p role="alert" className="text-sm text-red-600">
              {formError}
            </p>
          )}

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsModalOpen(false)}
              disabled={creating}
            >
              Cancel
            </Button>

            <Button
              onClick={() => void handleCreateRun()}
              loading={creating}
              disabled={
                creating ||
                datasetsLoading ||
                datasets.length === 0
              }
            >
              {creating ? "Creating..." : "Create Run"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Processing Run Modal */}
      <Modal
        isOpen={editingRun !== null}
        onClose={closeEditModal}
        title="Edit Processing Run"
        description="Update the processing status and execution details."
        size="lg"
      >
        <form onSubmit={handleUpdateRun} className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Run ID
            </label>

            <input
              value={editingRun?.id ?? ""}
              readOnly
              className="w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2.5 text-sm text-slate-600"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Dataset
            </label>

            <input
              value={
                datasets.find(
                  (dataset) => dataset.id === editingRun?.dataset_id
                )?.name ?? `Dataset ID: ${editingRun?.dataset_id ?? ""}`
              }
              readOnly
              className="w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2.5 text-sm text-slate-600"
            />
          </div>

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
              onChange={(event) => setEditStatus(event.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
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
              value={editRecordsProcessed}
              onChange={(event) =>
                setEditRecordsProcessed(event.target.value)
              }
              required
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
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
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {editFormError && (
            <p
              role="alert"
              className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600"
            >
              {editFormError}
            </p>
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

            <Button
              type="submit"
              loading={updating}
              disabled={updating}
            >
              {updating ? "Updating..." : "Update Run"}
            </Button>
          </div>
        </form>
      </Modal>
    </PageContainer>
  );
}
