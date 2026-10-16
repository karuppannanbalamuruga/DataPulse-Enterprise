
import { useCallback, useEffect, useState, type FormEvent } from "react";

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

interface Organization {
  id: number;
  name: string;
  slug: string;
}

export default function Organizations() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Create modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  // Edit modal state
  const [editingOrganization, setEditingOrganization] =
    useState<Organization | null>(null);
  const [editName, setEditName] = useState("");
  const [editSlug, setEditSlug] = useState("");
  const [editError, setEditError] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  // Load organizations from the backend
  const loadOrganizations = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const data = await getOrganizations();
      setOrganizations(data as Organization[]);
    } catch (err) {
      console.error("Failed to load organizations:", err);
      setError("Unable to load organizations. Check your backend server.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOrganizations();
  }, [loadOrganizations]);

  // Automatically generate a URL-friendly slug
  function handleNameChange(value: string) {
    setName(value);

    setSlug(
      value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
    );
  }

  // Create organization
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

    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(trimmedSlug)) {
      setFormError(
        "Use lowercase letters, numbers, and single hyphens in the slug."
      );
      return;
    }

    const slugExists = organizations.some(
      (organization) => organization.slug.toLowerCase() === trimmedSlug
    );

    if (slugExists) {
      setFormError("This slug already exists. Please use a different slug.");
      return;
    }

    try {
      setSaving(true);

      await createOrganization({
        name: trimmedName,
        slug: trimmedSlug,
      });

      setIsModalOpen(false);
      setName("");
      setSlug("");
      setSuccess("Organization created successfully.");

      await loadOrganizations();
    } catch (err) {
      console.error("Failed to create organization:", err);
      setFormError(
        "Unable to create organization. Check the details and try again."
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

  // Open edit modal and populate selected organization details
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

  // Update organization through the API
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

    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(trimmedSlug)) {
      setEditError(
        "Use lowercase letters, numbers, and single hyphens in the slug."
      );
      return;
    }

    const slugExists = organizations.some(
      (organization) =>
        organization.id !== editingOrganization.id &&
        organization.slug.toLowerCase() === trimmedSlug
    );

    if (slugExists) {
      setEditError("This slug already exists. Please use a different slug.");
      return;
    }

    try {
      setEditSaving(true);

      await updateOrganization(editingOrganization.id, {
        name: trimmedName,
        slug: trimmedSlug,
      });

      setEditingOrganization(null);
      setEditName("");
      setEditSlug("");
      setSuccess("Organization updated successfully.");

      await loadOrganizations();
    } catch (err) {
      console.error("Failed to update organization:", err);
      setEditError(
        "Unable to update organization. Check the details and try again."
      );
    } finally {
      setEditSaving(false);
    }
  }

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

      {/* API error message */}
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

      {/* Organization summary */}
      <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-sm font-medium text-slate-500">
          Total Organizations
        </p>

        <p className="mt-2 text-3xl font-bold text-blue-600">
          {organizations.length}
        </p>
      </div>

      {/* Organization table */}
      {loading ? (
        <Loader message="Loading organizations..." />
      ) : error && organizations.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <p className="text-sm text-slate-500">
            Organization data is unavailable.
          </p>
        </div>
      ) : organizations.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white">
          <EmptyState
            title="No organizations found"
            description="Create your first organization to get started."
          />
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-6 py-4 font-medium">Organization ID</th>
                <th className="px-6 py-4 font-medium">Organization Name</th>
                <th className="px-6 py-4 font-medium">Slug</th>
                <th className="px-6 py-4 text-center font-medium">Actions</th>
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

                  <td className="px-6 py-4 text-center">
                    <button
                      type="button"
                      onClick={() => openEditModal(organization)}
                      title="Edit organization"
                      aria-label={`Edit ${organization.name}`}
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
            onChange={(event) => handleNameChange(event.target.value)}
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
    </PageContainer>
  );
}
