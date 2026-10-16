import { useCallback, useEffect, useState, type FormEvent } from "react";

import PageContainer from "../components/layout/PageContainer";
import Button from "../components/common/Button";
import Loader from "../components/common/Loader";
import EmptyState from "../components/common/EmptyState";
import Badge from "../components/common/Badge";
import Input from "../components/common/Input";
import Modal from "../components/common/Model";

import {
  getDatasets,
  createDataset,
  getOrganizations,
  updateDataset,
} from "../services/api";

import type { Dataset, CreateDatasetPayload } from "../types/dataset";

interface Organization {
  id: number;
  name: string;
  slug: string;
}

const SOURCE_TYPES = ["CSV", "Excel", "Database", "API"];

const DATASET_STATUSES = ["pending", "processing", "completed", "failed"];

export default function Datasets() {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);

  const [loading, setLoading] = useState(true);
  const [organizationsLoading, setOrganizationsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editSaving, setEditSaving] = useState(false);

  const [pageError, setPageError] = useState("");
  const [formError, setFormError] = useState("");
  const [editError, setEditError] = useState("");
  const [message, setMessage] = useState("");

  // Create form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [sourceType, setSourceType] = useState("CSV");
  const [organizationId, setOrganizationId] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Edit form state
  const [editingDataset, setEditingDataset] = useState<Dataset | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editSourceType, setEditSourceType] = useState("CSV");
  const [editOrganizationId, setEditOrganizationId] = useState("");
  const [editStatus, setEditStatus] = useState("pending");

  const loadDatasets = useCallback(async () => {
    try {
      setLoading(true);
      setPageError("");

      const data = await getDatasets();
      setDatasets(data);
    } catch (error) {
      console.error("Failed to load datasets:", error);
      setPageError("Unable to load datasets. Please check the backend server.");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadOrganizations = useCallback(async () => {
    try {
      setOrganizationsLoading(true);

      const data = await getOrganizations();
      setOrganizations(data);
    } catch (error) {
      console.error("Failed to load organizations:", error);
      setFormError("Unable to load organizations. Please try again.");
    } finally {
      setOrganizationsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDatasets();
    void loadOrganizations();
  }, [loadDatasets, loadOrganizations]);

  // Create dataset
  function openCreateModal() {
    setFormError("");
    setMessage("");
    setName("");
    setDescription("");
    setSourceType("CSV");
    setOrganizationId("");
    setIsCreateModalOpen(true);
  }

  function closeCreateModal() {
    if (saving) return;
    setIsCreateModalOpen(false);
    setFormError("");
  }

  async function handleCreateDataset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");
    setMessage("");

    if (!name.trim()) {
      setFormError("Please enter a dataset name.");
      return;
    }

    const selectedOrganizationId = Number(organizationId);

    if (
      !Number.isInteger(selectedOrganizationId) ||
      selectedOrganizationId <= 0
    ) {
      setFormError("Please select a valid organization.");
      return;
    }

    try {
      setSaving(true);

      const payload: CreateDatasetPayload = {
        organization_id: selectedOrganizationId,
        name: name.trim(),
        description: description.trim(),
        source_type: sourceType,
      };

      await createDataset(payload);

      setIsCreateModalOpen(false);
      setMessage("Dataset created successfully.");

      await loadDatasets();
    } catch (error) {
      console.error("Failed to create dataset:", error);
      setFormError(
        "Failed to create dataset. Please check the details and try again.",
      );
    } finally {
      setSaving(false);
    }
  }

  // Open edit modal with the selected row's values
  function openEditModal(dataset: Dataset) {
    setEditingDataset(dataset);
    setEditName(dataset.name);
    setEditDescription(dataset.description ?? "");
    setEditSourceType(dataset.source_type || "CSV");
    setEditOrganizationId(String(dataset.organization_id));
    setEditStatus(dataset.status?.toLowerCase() || "pending");
    setEditError("");
    setMessage("");
  }

  function closeEditModal() {
    if (editSaving) return;
    setEditingDataset(null);
    setEditError("");
  }

  // Update selected dataset using the PUT API
  async function handleUpdateDataset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!editingDataset) return;

    setEditError("");
    setMessage("");

    const selectedOrganizationId = Number(editOrganizationId);

    if (!editName.trim()) {
      setEditError("Please enter a dataset name.");
      return;
    }

    if (
      !Number.isInteger(selectedOrganizationId) ||
      selectedOrganizationId <= 0
    ) {
      setEditError("Please select a valid organization.");
      return;
    }

    if (!DATASET_STATUSES.includes(editStatus)) {
      setEditError("Please select a valid dataset status.");
      return;
    }

    try {
      setEditSaving(true);

      await updateDataset(editingDataset.id, {
        organization_id: selectedOrganizationId,
        name: editName.trim(),
        description: editDescription.trim(),
        source_type: editSourceType,
        status: editStatus,
      });

      setEditingDataset(null);
      setMessage("Dataset updated successfully.");

      await loadDatasets();
    } catch (error) {
      console.error("Failed to update dataset:", error);
      setEditError(
        "Failed to update dataset. Please check the details and try again.",
      );
    } finally {
      setEditSaving(false);
    }
  }

  function getStatusBadge(status?: string) {
    switch (status?.toLowerCase()) {
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

  return (
    <PageContainer>
      {/* Page heading */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Datasets</h2>
          <p className="mt-1 text-sm text-slate-500">
            Create and manage your registered datasets.
          </p>
        </div>

        <Button onClick={openCreateModal}>+ Create Dataset</Button>
      </div>

      {/* Success message */}
      {message && (
        <div
          role="status"
          className="mb-5 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700"
        >
          {message}
        </div>
      )}

      {/* Dataset table */}
      {loading ? (
        <Loader message="Loading datasets..." />
      ) : pageError ? (
        <div className="rounded-xl border border-red-200 bg-white p-6">
          <p role="alert" className="text-sm text-red-600">
            {pageError}
          </p>
          <Button className="mt-4" onClick={() => void loadDatasets()}>
            Try Again
          </Button>
        </div>
      ) : datasets.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white">
          <EmptyState
            title="No datasets found"
            description="Create your first dataset to get started."
          />
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-5 py-4 font-medium">Dataset Name</th>
                <th className="px-5 py-4 font-medium">Organization</th>
                <th className="px-5 py-4 font-medium">Source Type</th>
                <th className="px-5 py-4 font-medium">Status</th>
                <th className="px-5 py-4 text-center font-medium">Actions</th>
              </tr>
            </thead>

            <tbody>
              {datasets.map((dataset) => (
                <tr
                  key={dataset.id}
                  className="border-t border-slate-100 transition hover:bg-slate-50"
                >
                  <td className="px-5 py-4 font-medium text-slate-800">
                    {dataset.name}
                  </td>

                  <td className="px-5 py-4 text-slate-600">
                    {organizations.find(
                      (organization) =>
                        organization.id === dataset.organization_id,
                    )?.name ??
                      dataset.organization_id ??
                      "—"}
                  </td>

                  <td className="px-5 py-4 text-slate-600">
                    {dataset.source_type || "—"}
                  </td>

                  <td className="px-5 py-4">
                    <Badge status={getStatusBadge(dataset.status)}>
                      {dataset.status || "Unknown"}
                    </Badge>
                  </td>

                  <td className="px-5 py-4 text-center">
                    <button
                      type="button"
                      onClick={() => openEditModal(dataset)}
                      title="Edit dataset"
                      aria-label={`Edit ${dataset.name}`}
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

      {/* Create Dataset Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={closeCreateModal}
        title="Create New Dataset"
        description="Enter the details to register a new dataset."
        size="lg"
      >
        <form onSubmit={handleCreateDataset} className="space-y-5">
          <Input
            label="Dataset Name"
            placeholder="Customer Analytics Dataset"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />

          <div className="w-full flex gap-16">
            <label
              htmlFor="dataset-source"
              className="mt-2.5 block text-sm font-medium text-slate-700 text-nowrap"
            >
              Source Type
            </label>
            <select
              id="dataset-source"
              value={sourceType}
              onChange={(event) => setSourceType(event.target.value)}
              className="ml-2.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              {SOURCE_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          <div className="w-full flex gap-16">
            <label
              htmlFor="dataset-organization"
              className="mt-2.5 block text-sm font-medium text-slate-700 text-nowrap"
            >
              Organization
            </label>
            <select
              id="dataset-organization"
              value={organizationId}
              onChange={(event) => setOrganizationId(event.target.value)}
              required
              disabled={organizationsLoading || organizations.length === 0}
              className="ml-2.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
            >
              <option value="">Select an organization</option>
              {organizations.map((organization) => (
                <option key={organization.id} value={organization.id}>
                  {organization.name}
                </option>
              ))}
            </select>
            {!organizationsLoading && organizations.length === 0 && (
              <p className="mt-2 text-sm text-amber-600">
                No organizations found. Create an organization first.
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="dataset-description"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Description
            </label>
            <textarea
              id="dataset-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Enter dataset description"
              rows={3}
              className="w-full rounded-lg border border-slate-300 px-3 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {formError && (
            <p
              role="alert"
              className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600"
            >
              {formError}
            </p>
          )}

          <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={closeCreateModal}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={saving}
              disabled={
                saving || organizationsLoading || organizations.length === 0
              }
            >
              {saving ? "Creating..." : "Create Dataset"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Dataset Modal */}
      <Modal
        isOpen={editingDataset !== null}
        onClose={closeEditModal}
        title="Edit Dataset"
        description="Update the selected dataset details."
        size="lg"
      >
        <form onSubmit={handleUpdateDataset} className="space-y-5">
          <Input
            label="Dataset Name"
            placeholder="Enter dataset name"
            value={editName}
            onChange={(event) => setEditName(event.target.value)}
            required
          />

          <div className="w-full flex gap-16">
            <label
              htmlFor="edit-dataset-source"
              className="mt-2.5 block text-sm font-medium text-slate-700 text-nowrap"
            >
              Source Type
            </label>
            <select
              id="edit-dataset-source"
              value={editSourceType}
              onChange={(event) => setEditSourceType(event.target.value)}
              className="ml-3 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              {SOURCE_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          <div className="w-full flex gap-16">
            <label
              htmlFor="edit-dataset-organization"
              className="mt-2.5 block text-sm font-medium text-slate-700 text-nowrap"
            >
              Organization
            </label>
            <select
              id="edit-dataset-organization"
              value={editOrganizationId}
              onChange={(event) => setEditOrganizationId(event.target.value)}
              required
              disabled={organizationsLoading || organizations.length === 0}
              className="ml-3 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
            >
              <option value="">Select an organization</option>
              {organizations.map((organization) => (
                <option key={organization.id} value={organization.id}>
                  {organization.name}
                </option>
              ))}
            </select>
          </div>

          <div className="w-full flex gap-16">
            <label
              htmlFor="edit-dataset-status"
              className="mt-2.5 block text-sm font-medium text-slate-700 text-nowrap"
            >
              Status
            </label>
            <select
              id="edit-dataset-status"
              value={editStatus}
              onChange={(event) => setEditStatus(event.target.value)}
              className="ml-12.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              {DATASET_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="edit-dataset-description"
              className="mt-2.5 block text-sm font-medium text-slate-700 text-nowrap"
            >
              Description
            </label>
            <textarea
              id="edit-dataset-description"
              value={editDescription}
              onChange={(event) => setEditDescription(event.target.value)}
              placeholder="Enter dataset description"
              rows={3}
              className="w-full rounded-lg border border-slate-300 px-3 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {editError && (
            <p
              role="alert"
              className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600"
            >
              {editError}
            </p>
          )}

          <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={closeEditModal}
              disabled={editSaving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={editSaving}
              disabled={
                editSaving || organizationsLoading || organizations.length === 0
              }
            >
              {editSaving ? "Updating..." : "Update Dataset"}
            </Button>
          </div>
        </form>
      </Modal>
    </PageContainer>
  );
}
