
import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
} from "react";

import PageContainer from "../components/layout/PageContainer";
import Button from "../components/common/Button";
import Input from "../components/common/Input";
import Loader from "../components/common/Loader";
import EmptyState from "../components/common/EmptyState";
import Modal from "../components/common/Model";

import {
  getOrganizations,
  createOrganization,
  updateOrganization,
} from "../services/api";

import type {
  Organization,
  CreateOrganizationPayload,
  UpdateOrganizationPayload,
} from "../types/organization";

export default function Organizations() {
  // Organization data
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Server-side search and pagination
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);

  // Create modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  // Edit modal
  const [editingOrganization, setEditingOrganization] =
    useState<Organization | null>(null);
  const [editName, setEditName] = useState("");
  const [editSlug, setEditSlug] = useState("");
  const [editError, setEditError] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  // View modal
  const [viewOrganization, setViewOrganization] =
    useState<Organization | null>(null);

  // Load data from backend
  const loadOrganizations = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await getOrganizations({
        page: currentPage,
        page_size: pageSize,
        search: search.trim(),
      });

      setOrganizations(response.items);
      setTotal(response.total);
      setTotalPages(response.total_pages);
    } catch (err) {
      console.error("Failed to load organizations:", err);
      setError("Unable to load organizations. Please check the backend server.");
      setOrganizations([]);
      setTotal(0);
      setTotalPages(0);
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, search, refreshKey]);

  useEffect(() => {
    void loadOrganizations();
  }, [loadOrganizations]);

  // Slug generation
  function generateSlug(value: string): string {
    return value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function isValidSlug(value: string): boolean {
    return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
  }

  // Search handler
  function handleSearchChange(value: string) {
    setSearch(value);
    setCurrentPage(1);
  }

  // Page size handler
  function handlePageSizeChange(value: number) {
    setPageSize(value);
    setCurrentPage(1);
  }

  // CREATE organization
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setFormError("");
    setSuccess("");

    const trimmedName = name.trim();
    const trimmedSlug = slug.trim().toLowerCase();

    if (!trimmedName || !trimmedSlug) {
      setFormError("Organization name and slug are required.");
      return;
    }

    if (!isValidSlug(trimmedSlug)) {
      setFormError(
        "Use lowercase letters, numbers, and single hyphens in the slug."
      );
      return;
    }

    const payload: CreateOrganizationPayload = {
      name: trimmedName,
      slug: trimmedSlug,
    };

    try {
      setSaving(true);

      await createOrganization(payload);

      setIsModalOpen(false);
      setName("");
      setSlug("");
      setSearch("");
      setCurrentPage(1);
      setSuccess("Organization created successfully.");
      setRefreshKey((previous) => previous + 1);
    } catch (err) {
      console.error("Failed to create organization:", err);
      setFormError(
        "Unable to create organization. The name or slug may already exist."
      );
    } finally {
      setSaving(false);
    }
  }

  function handleCloseModal() {
    if (saving) return;

    setIsModalOpen(false);
    setName("");
    setSlug("");
    setFormError("");
  }

  // Open edit modal
  function openEditModal(organization: Organization) {
    setEditingOrganization(organization);
    setEditName(organization.name);
    setEditSlug(organization.slug);
    setEditError("");
    setSuccess("");
  }

  function handleCloseEditModal() {
    if (editSaving) return;

    setEditingOrganization(null);
    setEditName("");
    setEditSlug("");
    setEditError("");
  }

  // UPDATE organization using PATCH
  async function handleUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!editingOrganization) return;

    setEditError("");
    setSuccess("");

    const trimmedName = editName.trim();
    const trimmedSlug = editSlug.trim().toLowerCase();

    if (!trimmedName || !trimmedSlug) {
      setEditError("Organization name and slug are required.");
      return;
    }

    if (!isValidSlug(trimmedSlug)) {
      setEditError(
        "Use lowercase letters, numbers, and single hyphens in the slug."
      );
      return;
    }

    const payload: UpdateOrganizationPayload = {
      name: trimmedName,
      slug: trimmedSlug,
    };

    try {
      setEditSaving(true);

      await updateOrganization(editingOrganization.id, payload);

      setEditingOrganization(null);
      setEditName("");
      setEditSlug("");
      setSuccess("Organization updated successfully.");
      setRefreshKey((previous) => previous + 1);
    } catch (err) {
      console.error("Failed to update organization:", err);
      setEditError(
        "Unable to update organization. The name or slug may already exist."
      );
    } finally {
      setEditSaving(false);
    }
  }

  const startRecord = total === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endRecord = Math.min(currentPage * pageSize, total);

  return (
    <PageContainer>
      {/* Page heading */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Organizations
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Manage organizations registered in DataPulse Enterprise.
          </p>
        </div>

        <Button
          onClick={() => {
            setSuccess("");
            setFormError("");
            setName("");
            setSlug("");
            setIsModalOpen(true);
          }}
        >
          + Create Organization
        </Button>
      </div>

      {/* Success message */}
      {success && (
        <div
          role="status"
          className="mb-5 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700"
        >
          {success}
        </div>
      )}

      {/* API error */}
      {error && (
        <div
          role="alert"
          className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4"
        >
          <p className="text-sm text-red-700">{error}</p>
          <Button
            className="mt-3"
            onClick={() => void loadOrganizations()}
          >
            Try Again
          </Button>
        </div>
      )}

      {/* Summary cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">
            Total Organizations
          </p>
          <p className="mt-2 text-3xl font-bold text-blue-600">
            {total}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">
            Organizations on This Page
          </p>
          <p className="mt-2 text-3xl font-bold text-slate-900">
            {organizations.length}
          </p>
        </div>
      </div>

      {/* Search and page size */}
      <div className="mb-4 flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="w-full sm:max-w-md">
          <label
            htmlFor="organization-search"
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            Search Organizations
          </label>

          <input
            id="organization-search"
            type="search"
            value={search}
            onChange={(event) => handleSearchChange(event.target.value)}
            placeholder="Search by name, slug or ID..."
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </div>

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
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
        </div>
      </div>

      {/* Organizations table */}
      {loading ? (
        <Loader message="Loading organizations..." />
      ) : error ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <EmptyState
            title="Unable to load organizations"
            description="Check your backend connection and try again."
          />
        </div>
      ) : organizations.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <EmptyState
            title={
              search.trim()
                ? "No matching organizations"
                : "No organizations found"
            }
            description={
              search.trim()
                ? "Try a different name, slug, or organization ID."
                : "Create your first organization to get started."
            }
          />
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-6 py-4 font-medium">
                    Organization ID
                  </th>
                  <th className="px-6 py-4 font-medium">
                    Organization Name
                  </th>
                  <th className="px-6 py-4 font-medium">Slug</th>
                  <th className="px-6 py-4 text-center font-medium">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {organizations.map((organization) => (
                  <tr
                    key={organization.id}
                    className="border-t border-slate-100 hover:bg-slate-50"
                  >
                    <td className="px-6 py-4 font-medium text-slate-700">
                      #{organization.id}
                    </td>

                    <td className="px-6 py-4 font-medium text-slate-900">
                      {organization.name}
                    </td>

                    <td className="px-6 py-4">
                      <span className="rounded-md bg-slate-100 px-2 py-1 font-mono text-xs text-slate-600">
                        {organization.slug}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex flex-wrap items-center justify-center gap-2">
                        <Button
                          variant="secondary"
                          onClick={() => setViewOrganization(organization)}
                        >
                          View
                        </Button>

                        <Button
                          onClick={() => openEditModal(organization)}
                        >
                          Edit
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <p className="text-sm text-slate-500">
              Showing{" "}
              <span className="font-medium text-slate-700">
                {startRecord}–{endRecord}
              </span>{" "}
              of{" "}
              <span className="font-medium text-slate-700">
                {total}
              </span>{" "}
              organizations
            </p>

            <div className="flex items-center justify-between gap-3 sm:justify-end">
              <Button
                variant="secondary"
                disabled={currentPage <= 1 || loading}
                onClick={() =>
                  setCurrentPage((page) => Math.max(1, page - 1))
                }
              >
                Previous
              </Button>

              <span className="whitespace-nowrap text-sm text-slate-700">
                Page {currentPage} of {Math.max(totalPages, 1)}
              </span>

              <Button
                variant="secondary"
                disabled={
                  currentPage >= totalPages ||
                  totalPages === 0 ||
                  loading
                }
                onClick={() =>
                  setCurrentPage((page) =>
                    Math.min(totalPages, page + 1)
                  )
                }
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Create Organization Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title="Create Organization"
        description="Enter the details to register a new organization."
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            label="Organization Name"
            placeholder="e.g. Acme Technologies"
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              setSlug(generateSlug(event.target.value));
            }}
            required
          />

          <Input
            label="Organization Slug"
            placeholder="e.g. acme-technologies"
            value={slug}
            onChange={(event) => setSlug(event.target.value)}
            required
          />

          <p className="-mt-3 text-xs text-slate-500">
            Slug is generated automatically from the name. You can edit it.
          </p>

          {formError && (
            <p role="alert" className="text-sm text-red-600">
              {formError}
            </p>
          )}

          <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={handleCloseModal}
              disabled={saving}
            >
              Cancel
            </Button>

            <Button type="submit" loading={saving} disabled={saving}>
              {saving ? "Creating..." : "Create Organization"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Organization Modal */}
      <Modal
        isOpen={editingOrganization !== null}
        onClose={handleCloseEditModal}
        title="Edit Organization"
        description="Update the organization name and slug."
        size="md"
      >
        <form onSubmit={handleUpdate} className="space-y-5">
          <Input
            label="Organization Name"
            placeholder="Enter organization name"
            value={editName}
            onChange={(event) => setEditName(event.target.value)}
            required
          />

          <Input
            label="Organization Slug"
            placeholder="e.g. acme-technologies"
            value={editSlug}
            onChange={(event) => setEditSlug(event.target.value)}
            required
          />

          <p className="-mt-3 text-xs text-slate-500">
            Use lowercase letters, numbers, and hyphens.
          </p>

          {editError && (
            <p role="alert" className="text-sm text-red-600">
              {editError}
            </p>
          )}

          <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={handleCloseEditModal}
              disabled={editSaving}
            >
              Cancel
            </Button>

            <Button
              type="submit"
              loading={editSaving}
              disabled={editSaving}
            >
              {editSaving ? "Updating..." : "Update Organization"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* View Organization Modal */}
      <Modal
        isOpen={viewOrganization !== null}
        onClose={() => setViewOrganization(null)}
        title="Organization Details"
        description="View organization information."
        size="md"
      >
        {viewOrganization && (
          <div className="space-y-4">
            <div className="rounded-lg bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Organization ID</p>
              <p className="mt-1 font-semibold text-slate-900">
                #{viewOrganization.id}
              </p>
            </div>

            <div className="rounded-lg bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Organization Name</p>
              <p className="mt-1 font-semibold text-slate-900">
                {viewOrganization.name}
              </p>
            </div>

            <div className="rounded-lg bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Slug</p>
              <p className="mt-1 break-all font-mono text-slate-900">
                {viewOrganization.slug}
              </p>
            </div>

            <div className="flex justify-end border-t border-slate-100 pt-4">
              <Button
                type="button"
                onClick={() => setViewOrganization(null)}
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </PageContainer>
  );
}
