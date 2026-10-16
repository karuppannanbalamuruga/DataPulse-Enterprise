
import { useEffect, useState } from "react";

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
} from "../services/api";

import type { ProcessingRun } from "../types/processingRun";
import type { Dataset } from "../types/dataset";

export default function ProcessingRuns() {
  const [runs, setRuns] = useState<ProcessingRun[]>([]);
  const [datasets, setDatasets] = useState<Dataset[]>([]);

  const [loading, setLoading] = useState(true);
  const [datasetsLoading, setDatasetsLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDatasetId, setSelectedDatasetId] = useState("");

  // Load all processing runs
  async function loadProcessingRuns() {
    try {
      setLoading(true);
      setError("");

      const data = await getProcessingRuns();
      setRuns(data);
    } catch {
      setError("Unable to load processing runs. Check the backend server.");
    } finally {
      setLoading(false);
    }
  }

  // Load datasets for the dropdown
  async function loadDatasets() {
    try {
      setDatasetsLoading(true);
      setFormError("");

      const data = await getDatasets();
      setDatasets(data);
    } catch {
      setFormError("Unable to load datasets. Please try again.");
    } finally {
      setDatasetsLoading(false);
    }
  }

  useEffect(() => {
    void loadProcessingRuns();
  }, []);

  // Open the create processing run modal
  async function openCreateModal() {
    setSelectedDatasetId("");
    setFormError("");
    setSuccessMessage("");
    setIsModalOpen(true);

    await loadDatasets();
  }

  // Create a processing run
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
      const errorMessage =
        typeof err === "object" &&
        err !== null &&
        "response" in err &&
        typeof err.response === "object" &&
        err.response !== null &&
        "data" in err.response &&
        typeof err.response.data === "object" &&
        err.response.data !== null &&
        "detail" in err.response.data &&
        typeof err.response.data.detail === "string"
          ? err.response.data.detail
          : "Unable to create processing run. Please try again.";

      setFormError(errorMessage);
    } finally {
      setCreating(false);
    }
  }

  // Return the badge status based on the run status
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

  // Format date values for display
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

        <div className="flex flex-wrap gap-3">
          <Button
            variant="secondary"
            onClick={() => void loadProcessingRuns()}
            disabled={loading}
          >
            Refresh
          </Button>

          <Button
            onClick={() => void openCreateModal()}
            disabled={creating}
          >
            Create Processing Run
          </Button>
        </div>
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

      {/* Loading and Error States */}
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
        /* Processing Runs Table */
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

                  <td className="px-5 py-4">{run.dataset_id}</td>

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
        size="md"
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
                {datasetsLoading
                  ? "Loading datasets..."
                  : "Choose a dataset"}
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
              Create Run
            </Button>
          </div>
        </div>
      </Modal>
    </PageContainer>
  );
}
