import { useCallback, useEffect, useState, type FormEvent } from "react";

import Button from "../components/common/Button";
import Loader from "../components/common/Loader";
import EmptyState from "../components/common/EmptyState";
import Input from "../components/common/Input";
import Modal from "../components/common/Model";
import Toast, { type ToastType } from "../components/common/Toast";

import {
  getDatasets,
  getDataset,
  createDataset,
  updateDataset,
  getOrganizations,
} from "../services/api";

import type {
  Dataset,
  DatasetListResponse,
  CreateDatasetPayload,
  UpdateDatasetPayload,
  DatasetQueryParams,
} from "../types/dataset";

interface Organization {
  id: number;
  name: string;
  slug?: string;
}

const SOURCE_TYPES = [
  { value: "file", label: "File" },
  { value: "csv", label: "CSV" },
  { value: "excel", label: "Excel" },
  { value: "database", label: "Database" },
  { value: "api", label: "API" },
];

const STATUSES = ["pending", "processing", "completed", "failed"];

const initialForm = {
  name: "",
  description: "",
  source_type: "csv",
  organization_id: "",
  status: "pending",
};

type DatasetForm = typeof initialForm;

export default function Datasets() {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);

  const [loading, setLoading] = useState(true);
  const [organizationsLoading, setOrganizationsLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [pageError, setPageError] = useState("");
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");

  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingDataset, setEditingDataset] = useState<Dataset | null>(null);
  const [viewingDataset, setViewingDataset] = useState<Dataset | null>(null);

  const [form, setForm] = useState<DatasetForm>(initialForm);
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof DatasetForm, string>>
  >({});

  const [toast, setToast] = useState<{
    message: string;
    type: ToastType;
  }>({
    message: "",
    type: "success",
  });

  const loadDatasets = useCallback(async () => {
    try {
      setLoading(true);
      setPageError("");

      const params: DatasetQueryParams = {
        search: search.trim() || undefined,
        status: statusFilter || undefined,
        source_type: sourceFilter || undefined,
        page,
        page_size: pageSize,
      };

      const response: DatasetListResponse = await getDatasets(params);

      setDatasets(response.items);
      setTotal(response.total);
      setTotalPages(response.total_pages);
    } catch (error) {
      console.error("Failed to load datasets:", error);
      setPageError("Unable to load datasets. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, sourceFilter, page, pageSize]);

  const loadOrganizations = useCallback(async () => {
    try {
      setOrganizationsLoading(true);

      const response = await getOrganizations();

      setOrganizations(
        Array.isArray(response)
          ? response
          : ((response as { items?: Organization[] }).items ?? []),
      );
    } catch (error) {
      console.error("Failed to load organizations:", error);
    } finally {
      setOrganizationsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDatasets();
  }, [loadDatasets]);

  useEffect(() => {
    void loadOrganizations();
  }, [loadOrganizations]);

  const resetForm = () => {
    setForm(initialForm);
    setFieldErrors({});
    setFormError("");
    setEditingDataset(null);
  };

  const openCreateModal = () => {
    resetForm();
    setViewingDataset(null);
    setModalOpen(true);
  };

  const openEditModal = async (dataset: Dataset) => {
    try {
      setFormError("");
      setFieldErrors({});

      const details = await getDataset(dataset.id);

      setEditingDataset(details);
      setViewingDataset(null);

      setForm({
        name: details.name,
        description: details.description ?? "",
        source_type: details.source_type.toLowerCase(),
        organization_id: String(details.organization_id),
        status: details.status.toLowerCase(),
      });

      setModalOpen(true);
    } catch (error) {
      console.error("Failed to load dataset details:", error);
      setPageError("Unable to load dataset details.");
    }
  };

  const openDetails = async (dataset: Dataset) => {
    try {
      setPageError("");

      const details = await getDataset(dataset.id);
      setViewingDataset(details);
      setModalOpen(false);
    } catch (error) {
      console.error("Failed to load dataset details:", error);
      setPageError("Unable to load dataset details.");
    }
  };

  const closeModal = () => {
    setModalOpen(false);
    setViewingDataset(null);
    resetForm();
  };

  const validateForm = () => {
    const errors: Partial<Record<keyof DatasetForm, string>> = {};

    if (!form.name.trim()) {
      errors.name = "Dataset name is required.";
    } else if (form.name.trim().length > 150) {
      errors.name = "Dataset name must be 150 characters or fewer.";
    }

    if (!form.organization_id) {
      errors.organization_id = "Please select an organization.";
    }

    if (!SOURCE_TYPES.some((item) => item.value === form.source_type)) {
      errors.source_type = "Please select a valid source type.";
    }

    if (!STATUSES.includes(form.status)) {
      errors.status = "Please select a valid status.";
    }

    setFieldErrors(errors);

    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setFormError("");
    setSuccessMessage("");

    if (!validateForm()) {
      return;
    }

    const organizationId = Number(form.organization_id);

    try {
      setSaving(true);

      if (editingDataset) {
        const payload: UpdateDatasetPayload = {
          name: form.name.trim(),
          description: form.description.trim() || null,
          source_type: form.source_type,
          status: form.status,
          organization_id: organizationId,
        };

        await updateDataset(editingDataset.id, payload);

        setToast({
          message: "Dataset updated successfully.",
          type: "success",
        });
      } else {
        const payload: CreateDatasetPayload = {
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          source_type: form.source_type,
          organization_id: organizationId,
        };

        await createDataset(payload);

        setToast({
          message: "Dataset created successfully.",
          type: "success",
        });
      }

      closeModal();

      // Return to the first page after creating or updating a dataset.
      setPage(1);

      // Reload the list after saving.
      await loadDatasets();
    } catch (error) {
      console.error("Failed to save dataset:", error);
      setFormError(
        "Unable to save the dataset. Check the fields and try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  const updateFilter = (
    type: "search" | "status" | "source",
    value: string,
  ) => {
    setPage(1);

    if (type === "search") {
      setSearch(value);
    } else if (type === "status") {
      setStatusFilter(value);
    } else {
      setSourceFilter(value);
    }
  };

  const formatDate = (value: string | null | undefined) => {
    if (!value) return "—";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "—";

    return date.toLocaleString();
  };

  const statusClass = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "processing":
        return "bg-blue-100 text-blue-800";
      case "failed":
        return "bg-red-100 text-red-800";
      default:
        return "bg-yellow-100 text-yellow-800";
    }
  };

  return (
    <div className="p-5">
      <div className="space-y-6">
        {/* Page heading */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Dataset Management
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              Create, search, filter, and manage your datasets.
            </p>
          </div>

          <Button onClick={openCreateModal}>+ Create Dataset</Button>
        </div>

        {/* Success and error messages */}
        {successMessage && (
          <div
            role="status"
            className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700"
          >
            {successMessage}
          </div>
        )}
        <Toast
          message={toast.message}
          type={toast.type}
          duration={5000}
          onClose={() =>
            setToast((current) => ({
              ...current,
              message: "",
            }))
          }
        />

        {pageError && (
          <div
            role="alert"
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
          >
            <span>{pageError}</span>

            <button
              type="button"
              onClick={() => void loadDatasets()}
              className="font-semibold underline"
            >
              Retry
            </button>
          </div>
        )}

        {/* Search and filters */}
        <div className="grid grid-cols-1 gap-4 rounded-xl border border-gray-200 bg-white p-4 md:grid-cols-3">
          <div>
            <label
              htmlFor="dataset-search"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Search by name
            </label>

            <input
              id="dataset-search"
              type="search"
              value={search}
              onChange={(event) => updateFilter("search", event.target.value)}
              placeholder="Enter dataset name..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div>
            <label
              htmlFor="dataset-status"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Filter by status
            </label>

            <select
              id="dataset-status"
              value={statusFilter}
              onChange={(event) => updateFilter("status", event.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
            >
              <option value="">All statuses</option>

              {STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="dataset-source"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Filter by source
            </label>

            <select
              id="dataset-source"
              value={sourceFilter}
              onChange={(event) => updateFilter("source", event.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
            >
              <option value="">All sources</option>

              {SOURCE_TYPES.map((source) => (
                <option key={source.value} value={source.value}>
                  {source.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Dataset table */}
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          {loading ? (
            <div className="flex min-h-52 items-center justify-center p-8">
              <Loader />
            </div>
          ) : datasets.length === 0 ? (
            <div className="p-8 text-center">
              <EmptyState
                title="No datasets found"
                description="No datasets match your search or filters. Try changing the filters or create a new dataset."
              />

              <p className="mt-3 text-sm text-gray-500">
                No datasets found. Try changing the filters or create a dataset.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[900px] w-full text-left text-sm">
                <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-5 py-4 font-semibold">Dataset Name</th>
                    <th className="px-5 py-4 font-semibold">Organization</th>
                    <th className="px-5 py-4 font-semibold">Source Type</th>
                    <th className="px-5 py-4 font-semibold">Status</th>
                    <th className="px-5 py-4 font-semibold">Created Date</th>
                    <th className="px-5 py-4 font-semibold">Updated Date</th>
                    <th className="px-5 py-4 font-semibold">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {datasets.map((dataset) => {
                    const organization = organizations.find(
                      (item) => item.id === dataset.organization_id,
                    );

                    return (
                      <tr
                        key={dataset.id}
                        className="transition hover:bg-gray-50"
                      >
                        <td className="px-5 py-4">
                          <div className="font-medium text-gray-900">
                            {dataset.name}
                          </div>

                          <div className="mt-1 max-w-xs truncate text-xs text-gray-500">
                            {dataset.description || "No description"}
                          </div>
                        </td>

                        <td className="px-5 py-4 text-gray-600">
                          {organization?.name ??
                            `Organization #${dataset.organization_id}`}
                        </td>

                        <td className="px-5 py-4 capitalize text-gray-600">
                          {dataset.source_type}
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusClass(dataset.status)}`}
                          >
                            {dataset.status}
                          </span>
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 text-gray-600">
                          {formatDate(dataset.created_at)}
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 text-gray-600">
                          {formatDate(dataset.updated_at)}
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => void openDetails(dataset)}
                              className="font-medium text-blue-600 hover:text-blue-800"
                            >
                              View
                            </button>

                            <button
                              type="button"
                              onClick={() => void openEditModal(dataset)}
                              className="font-medium text-indigo-600 hover:text-indigo-800"
                            >
                              Edit
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-gray-600">
            Total datasets: <strong>{total}</strong>
            {" · "}
            Page <strong>{page}</strong> of{" "}
            <strong>{Math.max(totalPages, 1)}</strong>
          </p>

          <div className="flex gap-2">
            <Button
              variant="secondary"
              disabled={page <= 1 || loading}
              onClick={() => setPage((current) => current - 1)}
            >
              Previous
            </Button>

            <Button
              variant="secondary"
              disabled={page >= totalPages || loading || totalPages === 0}
              onClick={() => setPage((current) => current + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </div>

      {/* Create and edit modal */}
      {modalOpen && (
        <Modal
          isOpen={modalOpen}
          onClose={closeModal}
          title={editingDataset ? "Edit Dataset" : "Create Dataset"}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            {formError && (
              <div
                role="alert"
                className="rounded-lg bg-red-50 p-3 text-sm text-red-700"
              >
                {formError}
              </div>
            )}

            <div>
              <label
                htmlFor="dataset-name"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                Dataset Name *
              </label>

              <Input
                value={form.name}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                  setForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }));

                  setFieldErrors((current) => ({
                    ...current,
                    name: "",
                  }));
                }}
                placeholder="Enter dataset name"
              />

              {fieldErrors.name && (
                <p className="mt-1 text-sm text-red-600">{fieldErrors.name}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="dataset-organization"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                Organization *
              </label>

              <select
                id="dataset-organization"
                value={form.organization_id}
                onChange={(event) => {
                  setForm((current) => ({
                    ...current,
                    organization_id: event.target.value,
                  }));

                  setFieldErrors((current) => ({
                    ...current,
                    organization_id: "",
                  }));
                }}
                disabled={organizationsLoading}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
              >
                <option value="">
                  {organizationsLoading
                    ? "Loading organizations..."
                    : "Select organization"}
                </option>

                {organizations.map((organization) => (
                  <option key={organization.id} value={organization.id}>
                    {organization.name}
                  </option>
                ))}
              </select>

              {fieldErrors.organization_id && (
                <p className="mt-1 text-sm text-red-600">
                  {fieldErrors.organization_id}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="dataset-source-type"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                Source Type *
              </label>

              <select
                id="dataset-source-type"
                value={form.source_type}
                onChange={(event) => {
                  setForm((current) => ({
                    ...current,
                    source_type: event.target.value,
                  }));
                }}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
              >
                {SOURCE_TYPES.map((source) => (
                  <option key={source.value} value={source.value}>
                    {source.label}
                  </option>
                ))}
              </select>

              {fieldErrors.source_type && (
                <p className="mt-1 text-sm text-red-600">
                  {fieldErrors.source_type}
                </p>
              )}
            </div>

            {editingDataset && (
              <div>
                <label
                  htmlFor="dataset-status-form"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  Status
                </label>

                <select
                  id="dataset-status-form"
                  value={form.status}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      status: event.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                >
                  {STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label
                htmlFor="dataset-description"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                Description
              </label>

              <textarea
                id="dataset-description"
                value={form.description}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                rows={3}
                placeholder="Enter dataset description"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
              <Button
                type="button"
                variant="secondary"
                onClick={closeModal}
                disabled={saving}
              >
                Cancel
              </Button>

              <Button type="submit" disabled={saving}>
                {saving
                  ? "Saving..."
                  : editingDataset
                    ? "Update Dataset"
                    : "Create Dataset"}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Dataset details modal */}
      {viewingDataset && (
        <Modal
          isOpen={Boolean(viewingDataset)}
          onClose={() => setViewingDataset(null)}
          title="Dataset Details"
        >
          <div className="space-y-4">
            <DetailRow label="Dataset ID" value={String(viewingDataset.id)} />
            <DetailRow label="Name" value={viewingDataset.name} />

            <DetailRow
              label="Organization"
              value={
                organizations.find(
                  (item) => item.id === viewingDataset.organization_id,
                )?.name ?? `Organization #${viewingDataset.organization_id}`
              }
            />

            <DetailRow
              label="Description"
              value={viewingDataset.description || "No description"}
            />

            <DetailRow label="Source Type" value={viewingDataset.source_type} />

            <DetailRow label="Status" value={viewingDataset.status} />

            <DetailRow
              label="Created At"
              value={formatDate(viewingDataset.created_at)}
            />

            <DetailRow
              label="Updated At"
              value={formatDate(viewingDataset.updated_at)}
            />

            <div className="flex justify-end border-t border-gray-100 pt-4">
              <Button onClick={() => setViewingDataset(null)}>Close</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-1 gap-1 border-b border-gray-100 pb-3 sm:grid-cols-[140px_1fr]">
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <p className="break-words text-sm text-gray-900">{value}</p>
    </div>
  );
}
