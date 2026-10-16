
import { useCallback, useEffect, useState } from "react";

import PageContainer from "../components/layout/PageContainer";
import Button from "../components/common/Button";
import Input from "../components/common/Input";
import Loader from "../components/common/Loader";
import EmptyState from "../components/common/EmptyState";
import Modal from "../components/common/Model";

import {
  getOrganizations,
  createOrganization,
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

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

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

  // Automatically create a URL-friendly slug from the name
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

  // Create a new organization through the API
  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
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

        <div className="flex gap-3">
          <Button
            variant="secondary"
            onClick={() => void loadOrganizations()}
            disabled={loading}
          >
            Refresh
          </Button>

          <Button
            onClick={() => {
              setSuccess("");
              setFormError("");
              setIsModalOpen(true);
            }}
          >
            + Create Organization
          </Button>
        </div>
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
              Create Organization
            </Button>
          </div>
        </form>
      </Modal>
    </PageContainer>
  );
}
