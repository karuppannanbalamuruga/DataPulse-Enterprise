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
  deleteDataset,
  uploadDatasetCSV,
  executeDatasetValidation,
} from "../services/api";

import type {
  CSVUploadResponse,
  ExecuteValidationResponse,
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
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [datasetToDelete, setDatasetToDelete] = useState<Dataset | null>(null);

  const [pageError, setPageError] = useState("");
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingDataset, setEditingDataset] = useState<Dataset | null>(null);
  const [viewingDataset, setViewingDataset] = useState<Dataset | null>(null);

  // CSV upload and validation execution state
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadingDataset, setUploadingDataset] = useState<Dataset | null>(null);
  const [selectedCSVFile, setSelectedCSVFile] = useState<File | null>(null);
  const [uploadingCSV, setUploadingCSV] = useState(false);
  const [executingValidation, setExecutingValidation] = useState(false);
  const [csvUploadResult, setCsvUploadResult] = useState<CSVUploadResponse | null>(null);
  const [validationResult, setValidationResult] = useState<ExecuteValidationResponse | null>(null);
  const [uploadError, setUploadError] = useState("");

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
        page: currentPage,
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
  }, [search, statusFilter, sourceFilter, currentPage, pageSize]);

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

      if (currentPage !== 1) {
        setCurrentPage(1);
      } else {
        await loadDatasets();
      }
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
    setCurrentPage(1);

    if (type === "search") {
      setSearch(value);
    } else if (type === "status") {
      setStatusFilter(value);
    } else {
      setSourceFilter(value);
    }
  };

  // Page size handler
  function handlePageSizeChange(value: number) {
    setPageSize(value);
    setCurrentPage(1);
  }

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

  function handleDelete(dataset: Dataset) {
    setDatasetToDelete(dataset);
  }

  function openUploadModal(dataset: Dataset) {
    setUploadingDataset(dataset);
    setSelectedCSVFile(null);
    setCsvUploadResult(null);
    setValidationResult(null);
    setUploadError("");
    setUploadModalOpen(true);
  }

  function closeUploadModal() {
    if (uploadingCSV || executingValidation) return;
    setUploadModalOpen(false);
    setUploadingDataset(null);
    setSelectedCSVFile(null);
    setCsvUploadResult(null);
    setValidationResult(null);
    setUploadError("");
  }

  async function handleCSVUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!uploadingDataset || !selectedCSVFile) {
      setUploadError("Please choose a CSV file first.");
      return;
    }

    if (!selectedCSVFile.name.toLowerCase().endsWith(".csv")) {
      setUploadError("Only .csv files are supported.");
      return;
    }

    if (selectedCSVFile.size > 10 * 1024 * 1024) {
      setUploadError("File size must be 10 MB or less.");
      return;
    }

    try {
      setUploadingCSV(true);
      setUploadError("");
      setValidationResult(null);

      const result = await uploadDatasetCSV(uploadingDataset.id, selectedCSVFile);
      setCsvUploadResult(result);
      setToast({
        message: "CSV uploaded successfully.",
        type: "success",
      });
    } catch (error) {
      console.error("CSV upload failed:", error);
      setUploadError("CSV upload failed. Please check the file and try again.");
    } finally {
      setUploadingCSV(false);
    }
  }

  async function handleExecuteValidation() {
    if (!uploadingDataset) return;

    try {
      setExecutingValidation(true);
      setUploadError("");

      const result = await executeDatasetValidation(uploadingDataset.id);
      setValidationResult(result);
      setToast({
        message: `Validation ${result.status}.`,
        type: result.status.toLowerCase() === "completed" ? "success" : "error",
      });
    } catch (error) {
      console.error("Validation execution failed:", error);
      setUploadError("Unable to execute validation. Please upload a CSV and try again.");
    } finally {
      setExecutingValidation(false);
    }
  }

  async function confirmDelete() {
    if (!datasetToDelete) return;

    const dataset = datasetToDelete;

    try {
      setDeletingId(dataset.id);
      setPageError("");
      await deleteDataset(dataset.id);
      setDatasetToDelete(null);

      setToast({
        message: `Dataset "${dataset.name}" deleted successfully.`,
        type: "success",
      });

      if (datasets.length === 1 && currentPage > 1) {
        setCurrentPage((page) => page - 1);
      } else {
        await loadDatasets();
      }
    } catch (error) {
      console.error("Failed to delete dataset:", error);
      setToast({
        message: "Unable to delete the dataset. Please try again.",
        type: "error",
      });
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="p-5">
      <div className="space-y-6">
        {/* Page heading */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
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
              className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
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
                        <td className="px-5 py-4 text-center">
                          <div className="inline-flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => openUploadModal(dataset)}
                              title="Upload CSV and run validation"
                              className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                            >
                              CSV / Validate
                            </button>
                            <button
                              type="button"
                              onClick={() => void openDetails(dataset)}
                              title="View validation rule"
                              className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-slate-50 p-2 text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-300"
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
                                <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
                                <circle cx="12" cy="12" r="3" />
                              </svg>
                            </button>
                            <button
                              type="button"
                              onClick={() => void openEditModal(dataset)}
                              title="Edit validation rule"
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
                            <button
                              type="button"
                              onClick={() => void handleDelete(dataset)}
                              disabled={deletingId === dataset.id}
                              title="Delete dataset"
                              aria-label={`Delete dataset ${dataset.name}`}
                              className="inline-flex items-center justify-center rounded-lg border border-red-200 bg-red-50 p-2 text-red-700 transition hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-300 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {deletingId === dataset.id ? (
                                <span className="px-0.5 text-xs">...</span>
                              ) : (
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
                                  <path d="M3 6h18" />
                                  <path d="M8 6V4h8v2" />
                                  <path d="m19 6-1 14H6L5 6" />
                                  <path d="M10 11v5M14 11v5" />
                                </svg>
                              )}
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
            Page <strong>{currentPage}</strong> of{" "}
            <strong>{Math.max(totalPages, 1)}</strong>
          </p>

          <div className="flex items-center justify-between gap-3 sm:justify-end">
            <div className="flex items-center gap-3">
              <label
                htmlFor="organization-page-size"
                className="whitespace-nowrap text-sm text-slate-600"
              >
                Rows per page
              </label>

              <select
                id="organization-page-size"
                value={pageSize}
                onChange={(event) =>
                  handlePageSizeChange(Number(event.target.value))
                }
                className="rounded-lg border border-slate-300 pr-4 pl-1 py-1.5 text-sm outline-none focus:border-blue-500"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
            <Button
              variant="secondary"
              size="sm"
              disabled={currentPage <= 1 || loading}
              onClick={() => setCurrentPage((current) => current - 1)}
            >
              Previous
            </Button>
            <span className="px-2 text-sm text-slate-600">
              Page {currentPage} of {Math.max(totalPages, 1)}
            </span>
            <Button
              variant="secondary"
              size="sm"
              disabled={
                currentPage >= totalPages || loading || totalPages === 0
              }
              onClick={() => setCurrentPage((current) => current + 1)}
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

      {/* Delete confirmation modal */}
      {datasetToDelete && (
        <Modal
          isOpen={Boolean(datasetToDelete)}
          onClose={() => {
            if (deletingId === null) setDatasetToDelete(null);
          }}
          title="Delete Dataset?"
        >
          <div className="space-y-5">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M3 6h18" />
                  <path d="M8 6V4h8v2" />
                  <path d="m19 6-1 14H6L5 6" />
                  <path d="M10 11v5M14 11v5" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-gray-900">
                  Are you sure you want to delete “{datasetToDelete.name}”?
                </p>
                <p className="mt-2 text-sm leading-6 text-gray-600">
                  This action cannot be undone. Related processing runs and validation rules may also be deleted.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setDatasetToDelete(null)}
                disabled={deletingId !== null}
              >
                Cancel
              </Button>
              <button
                type="button"
                onClick={() => void confirmDelete()}
                disabled={deletingId !== null}
                className="inline-flex items-center justify-center rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {deletingId === datasetToDelete.id ? "Deleting..." : "Delete Dataset"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* CSV upload and validation results modal */}
      {uploadModalOpen && uploadingDataset && (
        <Modal
          isOpen={uploadModalOpen}
          onClose={closeUploadModal}
          title={`CSV Upload & Validation — ${uploadingDataset.name}`}
          size="lg"
        >
          <div className="max-h-[75vh] space-y-5 overflow-y-auto">
            <form onSubmit={handleCSVUpload} className="space-y-3">
              <div>
                <label
                  htmlFor="dataset-csv-file"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  Select CSV file
                </label>
                <input
                  id="dataset-csv-file"
                  type="file"
                  accept=".csv,text/csv"
                  onChange={(event) => {
                    setSelectedCSVFile(event.target.files?.[0] ?? null);
                    setUploadError("");
                    setValidationResult(null);
                  }}
                  disabled={uploadingCSV || executingValidation}
                  className="block w-full rounded-lg border border-gray-300 p-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-blue-700"
                />
                <p className="mt-1 text-xs text-gray-500">
                  CSV format only. Maximum file size: 10 MB.
                </p>
              </div>

              {selectedCSVFile && (
                <p className="text-sm text-gray-600">
                  Selected: <strong>{selectedCSVFile.name}</strong>
                  {" "}({(selectedCSVFile.size / 1024).toFixed(1)} KB)
                </p>
              )}

              {uploadError && (
                <div
                  role="alert"
                  className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
                >
                  {uploadError}
                </div>
              )}

              <div className="flex flex-wrap justify-end gap-2">
                <Button
                  type="submit"
                  disabled={!selectedCSVFile || uploadingCSV || executingValidation}
                >
                  {uploadingCSV ? "Uploading..." : "Upload CSV"}
                </Button>
              </div>
            </form>

            {csvUploadResult && (
              <div className="space-y-2 rounded-lg border border-green-200 bg-green-50 p-4">
                <h3 className="font-semibold text-green-800">
                  {csvUploadResult.message}
                </h3>
                <p className="text-sm text-green-800">
                  File: {csvUploadResult.filename}
                </p>
                <p className="text-sm text-green-800">
                  Rows: {csvUploadResult.total_rows} · Size:{" "}
                  {(csvUploadResult.file_size / 1024).toFixed(1)} KB
                </p>
                <p className="text-sm text-green-800">
                  Columns: {csvUploadResult.columns.join(", ")}
                </p>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 pt-4">
              <div>
                <h3 className="font-semibold text-gray-900">Run validation</h3>
                <p className="text-xs text-gray-500">
                  Executes the active validation rules for this dataset.
                </p>
              </div>
              <Button
                type="button"
                onClick={() => void handleExecuteValidation()}
                disabled={executingValidation || uploadingCSV}
              >
                {executingValidation ? "Executing..." : "Execute Validation"}
              </Button>
            </div>

            {validationResult && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <div className="rounded-lg border border-gray-200 p-3">
                    <p className="text-xs text-gray-500">Quality score</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {Number(validationResult.quality_score).toFixed(1)}%
                    </p>
                  </div>
                  <div className="rounded-lg border border-gray-200 p-3">
                    <p className="text-xs text-gray-500">Records processed</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {validationResult.records_processed}
                    </p>
                  </div>
                  <div className="rounded-lg border border-gray-200 p-3">
                    <p className="text-xs text-gray-500">Rules executed</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {validationResult.total_rules_executed}
                    </p>
                  </div>
                  <div className="rounded-lg border border-gray-200 p-3">
                    <p className="text-xs text-gray-500">Passed checks</p>
                    <p className="text-2xl font-bold text-green-700">
                      {validationResult.passed_checks}
                    </p>
                  </div>
                  <div className="rounded-lg border border-gray-200 p-3">
                    <p className="text-xs text-gray-500">Failed checks</p>
                    <p className="text-2xl font-bold text-red-700">
                      {validationResult.failed_checks}
                    </p>
                  </div>
                  <div className="rounded-lg border border-gray-200 p-3">
                    <p className="text-xs text-gray-500">Run status</p>
                    <p className="mt-1 font-semibold capitalize text-gray-900">
                      {validationResult.status}
                    </p>
                  </div>
                </div>

                <p className="text-xs text-gray-500">
                  Processing Run ID: #{validationResult.processing_run_id}
                </p>

                <div>
                  <h3 className="mb-2 font-semibold text-gray-900">
                    Validation results
                  </h3>
                  {validationResult.results.length === 0 ? (
                    <p className="text-sm text-gray-500">
                      No validation results were returned.
                    </p>
                  ) : (
                    <div className="overflow-x-auto rounded-lg border border-gray-200">
                      <table className="min-w-full text-left text-sm">
                        <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                          <tr>
                            <th className="px-3 py-2">Rule ID</th>
                            <th className="px-3 py-2">Column</th>
                            <th className="px-3 py-2">Checked</th>
                            <th className="px-3 py-2">Passed</th>
                            <th className="px-3 py-2">Failed</th>
                            <th className="px-3 py-2">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {validationResult.results.map((item, index) => (
                            <tr key={`${item.rule_id}-${index}`}>
                              <td className="px-3 py-2">{item.rule_id}</td>
                              <td className="px-3 py-2">
                                {item.column_name ?? "—"}
                              </td>
                              <td className="px-3 py-2">{item.total_checked}</td>
                              <td className="px-3 py-2 text-green-700">
                                {item.passed_count}
                              </td>
                              <td className="px-3 py-2 text-red-700">
                                {item.failed_count}
                              </td>
                              <td className="px-3 py-2 capitalize">
                                {item.status}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="mb-2 font-semibold text-gray-900">
                    Failed validation issues ({validationResult.issues.length})
                  </h3>
                  {validationResult.issues.length === 0 ? (
                    <p className="rounded-lg bg-green-50 p-3 text-sm text-green-700">
                      No validation issues found.
                    </p>
                  ) : (
                    <div className="max-h-64 overflow-auto rounded-lg border border-gray-200">
                      <table className="min-w-full text-left text-sm">
                        <thead className="sticky top-0 bg-gray-50 text-xs uppercase text-gray-500">
                          <tr>
                            <th className="px-3 py-2">Row</th>
                            <th className="px-3 py-2">Rule ID</th>
                            <th className="px-3 py-2">Column</th>
                            <th className="px-3 py-2">Invalid value</th>
                            <th className="px-3 py-2">Error</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {validationResult.issues.map((issue, index) => (
                            <tr key={`${issue.rule_id}-${issue.row_number}-${index}`}>
                              <td className="px-3 py-2">{issue.row_number}</td>
                              <td className="px-3 py-2">{issue.rule_id}</td>
                              <td className="px-3 py-2">{issue.column_name}</td>
                              <td className="max-w-32 truncate px-3 py-2">
                                {issue.invalid_value ?? "—"}
                              </td>
                              <td className="min-w-48 px-3 py-2 text-red-700">
                                {issue.error_description}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex justify-end border-t border-gray-100 pt-3">
              <Button
                type="button"
                variant="secondary"
                onClick={closeUploadModal}
                disabled={uploadingCSV || executingValidation}
              >
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Dataset details modal */}
      {viewingDataset && (
        <Modal
          isOpen={Boolean(viewingDataset)}
          onClose={() => setViewingDataset(null)}
          title="Dataset Details"
          size="lg"
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
