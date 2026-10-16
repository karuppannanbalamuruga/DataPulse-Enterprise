
import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
} from "react";

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
} from "../services/api";

import type { Dataset, CreateDatasetPayload } from "../types/dataset";

// Organization response type
interface Organization {
  id: number;
  name: string;
  slug: string;
}

export default function Datasets() {
  // Dataset list
  const [datasets, setDatasets] = useState<Dataset[]>([]);

  // Organization list
  const [organizations, setOrganizations] = useState<Organization[]>([]);

  // Loading states
  const [loading, setLoading] = useState(true);
  const [organizationsLoading, setOrganizationsLoading] =
    useState(true);
  const [saving, setSaving] = useState(false);

  // Messages
  const [pageError, setPageError] = useState("");
  const [formError, setFormError] = useState("");
  const [message, setMessage] = useState("");

  // Dataset form fields
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [sourceType, setSourceType] = useState("CSV");
  const [organizationId, setOrganizationId] = useState("");

  // Modal state
  const [isCreateModalOpen, setIsCreateModalOpen] =
    useState(false);

  // Load datasets from backend
  const loadDatasets = useCallback(async () => {
    try {
      setLoading(true);
      setPageError("");

      const data = await getDatasets();
      setDatasets(data);
    } catch (error) {
      console.error("Failed to load datasets:", error);
      setPageError(
        "Unable to load datasets. Please check the backend server.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  // Load organizations from backend
  const loadOrganizations = useCallback(async () => {
    try {
      setOrganizationsLoading(true);

      const data = await getOrganizations();
      setOrganizations(data);
    } catch (error) {
      console.error("Failed to load organizations:", error);
      setFormError(
        "Unable to load organizations. Please try again.",
      );
    } finally {
      setOrganizationsLoading(false);
    }
  }, []);

  // Load data when the page opens
  useEffect(() => {
    void loadDatasets();
    void loadOrganizations();
  }, [loadDatasets, loadOrganizations]);

  // Open create modal
  function openCreateModal() {
    setFormError("");
    setMessage("");
    setIsCreateModalOpen(true);
  }

  // Close modal
  function closeCreateModal() {
    if (saving) return;

    setIsCreateModalOpen(false);
    setFormError("");
  }

  // Reset form fields
  function resetForm() {
    setName("");
    setDescription("");
    setSourceType("CSV");
    setOrganizationId("");
    setFormError("");
  }

  // Create dataset
  async function handleCreateDataset(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setFormError("");
    setMessage("");

    if (!name.trim()) {
      setFormError("Please enter a dataset name.");
      return;
    }

    if (!organizationId) {
      setFormError("Please select an organization.");
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

    const payload: CreateDatasetPayload = {
      organization_id: selectedOrganizationId,
      name: name.trim(),
      description: description.trim(),
      source_type: sourceType,
    };

    try {
      setSaving(true);

      await createDataset(payload);

      setMessage("Dataset created successfully!");
      setIsCreateModalOpen(false);
      resetForm();

      // Refresh dataset list after creation
      await loadDatasets();
    } catch (error) {
      console.error("Failed to create dataset:", error);
      setFormError(
        "Failed to create dataset. Please check the selected organization and backend API.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <PageContainer>
      {/* Page Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            Datasets
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Create and manage your registered datasets.
          </p>
        </div>

        <Button onClick={openCreateModal}>
          + Create Dataset
        </Button>
      </div>

      {/* Success Message */}
      {message && (
        <div
          role="status"
          className="mb-5 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700"
        >
          {message}
        </div>
      )}

      {/* Create Dataset Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={closeCreateModal}
        title="Create New Dataset"
        description="Enter the details to register a new dataset."
        size="md"
      >
        <form
          onSubmit={handleCreateDataset}
          className="space-y-5"
        >
          {/* Dataset Name */}
          <Input
            label="Dataset Name"
            placeholder="Customer Analytics Dataset"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />

          {/* Description */}
          <div>
            <label
              htmlFor="dataset-description"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Description
            </label>

            <textarea
              id="dataset-description"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              placeholder="Enter dataset description"
              rows={3}
              value={description}
              onChange={(event) =>
                setDescription(event.target.value)
              }
            />
          </div>

          {/* Source Type */}
          <div>
            <label
              htmlFor="dataset-source"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Source Type
            </label>

            <select
              id="dataset-source"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              value={sourceType}
              onChange={(event) =>
                setSourceType(event.target.value)
              }
            >
              <option value="CSV">CSV</option>
              <option value="Excel">Excel</option>
              <option value="Database">Database</option>
              <option value="API">API</option>
            </select>
          </div>

          {/* Organization Dropdown */}
          <div>
            <label
              htmlFor="dataset-organization"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Organization
            </label>

            <select
              id="dataset-organization"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100"
              value={organizationId}
              onChange={(event) =>
                setOrganizationId(event.target.value)
              }
              required
              disabled={
                organizationsLoading ||
                organizations.length === 0
              }
            >
              <option value="">
                {organizationsLoading
                  ? "Loading organizations..."
                  : "Select an organization"}
              </option>

              {organizations.map((organization) => (
                <option
                  key={organization.id}
                  value={organization.id}
                >
                  {organization.name}
                </option>
              ))}
            </select>

            {!organizationsLoading &&
              organizations.length === 0 && (
                <p className="mt-1.5 text-sm text-amber-600">
                  No organizations found. Create an organization
                  first.
                </p>
              )}
          </div>

          {/* Form Error */}
          {formError && (
            <p
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600"
            >
              {formError}
            </p>
          )}

          {/* Form Actions */}
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
                saving ||
                organizationsLoading ||
                organizations.length === 0
              }
            >
              {saving ? "Creating..." : "Create Dataset"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Dataset List Header */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">
            Registered Datasets
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            View all registered datasets.
          </p>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={() => void loadDatasets()}
          disabled={loading}
        >
          Refresh
        </Button>
      </div>

      {/* Dataset Loading State */}
      {loading ? (
        <Loader message="Loading datasets..." />
      ) : pageError ? (
        /* API Error State */
        <div className="rounded-xl border border-red-200 bg-white p-6">
          <p role="alert" className="text-sm text-red-600">
            {pageError}
          </p>

          <Button
            className="mt-4"
            onClick={() => void loadDatasets()}
          >
            Try Again
          </Button>
        </div>
      ) : datasets.length === 0 ? (
        /* Empty State */
        <div className="rounded-xl border border-slate-200 bg-white">
          <EmptyState
            title="No datasets found"
            description="Create your first dataset using the Create Dataset button."
          />
        </div>
      ) : (
        /* Dataset Table */
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-5 py-4 font-medium">
                  Dataset Name
                </th>

                <th className="px-5 py-4 font-medium">
                  Organization
                </th>

                <th className="px-5 py-4 font-medium">
                  Source Type
                </th>

                <th className="px-5 py-4 font-medium">
                  Status
                </th>
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
                        organization.id ===
                        dataset.organization_id,
                    )?.name ?? dataset.organization_id ?? "—"}
                  </td>

                  <td className="px-5 py-4 text-slate-600">
                    {dataset.source_type || "—"}
                  </td>

                  <td className="px-5 py-4">
                    <Badge
                      status={
                        dataset.status?.toLowerCase() ===
                        "completed"
                          ? "success"
                          : dataset.status?.toLowerCase() ===
                              "failed"
                            ? "error"
                            : "neutral"
                      }
                    >
                      {dataset.status || "Unknown"}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PageContainer>
  );
}
