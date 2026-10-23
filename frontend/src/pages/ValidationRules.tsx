
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
import Badge from "../components/common/Badge";
import Modal from "../components/common/Model";

import {
  getDatasets,
  getValidationRules,
  createValidationRule,
  updateValidationRule,
} from "../services/api";

import type { Dataset } from "../types/dataset";
import type {
  ValidationRule,
  CreateValidationRulePayload,
} from "../types/validationRule";

const RULE_TYPES = [
  { value: "not_null", label: "Not Null" },
  { value: "unique", label: "Unique" },
  { value: "email", label: "Email Format" },
  { value: "range", label: "Range" },
  { value: "regex", label: "Regular Expression" },
];

export default function ValidationRules() {
  const [rules, setRules] = useState<ValidationRule[]>([]);
  const [datasets, setDatasets] = useState<Dataset[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [datasetsLoading, setDatasetsLoading] = useState(true);

  const [pageError, setPageError] = useState("");
  const [formError, setFormError] = useState("");
  const [editError, setEditError] = useState("");
  const [message, setMessage] = useState("");

  // Create modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [datasetId, setDatasetId] = useState("");
  const [name, setName] = useState("");
  const [ruleType, setRuleType] = useState("not_null");
  const [description, setDescription] = useState("");

  // Edit modal state
  const [editingRule, setEditingRule] = useState<ValidationRule | null>(null);
  const [editDatasetId, setEditDatasetId] = useState("");
  const [editName, setEditName] = useState("");
  const [editRuleType, setEditRuleType] = useState("not_null");
  const [editDescription, setEditDescription] = useState("");
  const [editIsActive, setEditIsActive] = useState(true);

  // Load validation rules
  const loadRules = useCallback(async () => {
    try {
      setLoading(true);
      setPageError("");

      const data = await getValidationRules();
      setRules(data);
    } catch (error) {
      console.error("Failed to load validation rules:", error);
      setPageError(
        "Unable to load validation rules. Please check the backend."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  // Load available datasets
  const loadDatasets = useCallback(async () => {
    try {
      setDatasetsLoading(true);

      const data = await getDatasets();
      setDatasets(data.items);
    } catch (error) {
      console.error("Failed to load datasets:", error);
      setFormError("Unable to load datasets. Please try again.");
    } finally {
      setDatasetsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRules();
    void loadDatasets();
  }, [loadRules, loadDatasets]);

  // Open create modal
  function openModal() {
    setFormError("");
    setMessage("");
    setDatasetId("");
    setName("");
    setRuleType("not_null");
    setDescription("");
    setIsModalOpen(true);
  }

  // Close create modal
  function closeModal() {
    if (saving) return;

    setIsModalOpen(false);
    setFormError("");
  }

  // Create validation rule
  async function handleCreateRule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setFormError("");
    setMessage("");

    if (!datasetId) {
      setFormError("Please select a dataset.");
      return;
    }

    if (!name.trim()) {
      setFormError("Please enter a rule name.");
      return;
    }

    const payload: CreateValidationRulePayload = {
      dataset_id: Number(datasetId),
      name: name.trim(),
      rule_type: ruleType,
      description: description.trim(),
      is_active: true,
    };

    try {
      setSaving(true);

      await createValidationRule(payload);

      setMessage("Validation rule created successfully!");
      setIsModalOpen(false);

      setDatasetId("");
      setName("");
      setRuleType("not_null");
      setDescription("");

      await loadRules();
    } catch (error) {
      console.error("Failed to create validation rule:", error);
      setFormError(
        "Failed to create validation rule. Please check the selected dataset and backend API."
      );
    } finally {
      setSaving(false);
    }
  }

  // Open edit modal with selected rule values
  function openEditModal(rule: ValidationRule) {
    setEditingRule(rule);
    setEditDatasetId(String(rule.dataset_id));
    setEditName(rule.name);
    setEditRuleType(rule.rule_type);
    setEditDescription(rule.description ?? "");
    setEditIsActive(rule.is_active);
    setEditError("");
    setMessage("");
  }

  // Close edit modal
  function closeEditModal() {
    if (updating) return;

    setEditingRule(null);
    setEditError("");
  }

  // Update validation rule through API
  async function handleUpdateRule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!editingRule) return;

    setEditError("");
    setMessage("");

    if (!editDatasetId) {
      setEditError("Please select a dataset.");
      return;
    }

    if (!editName.trim()) {
      setEditError("Please enter a rule name.");
      return;
    }

    try {
      setUpdating(true);

      await updateValidationRule(editingRule.id, {
        dataset_id: Number(editDatasetId),
        name: editName.trim(),
        rule_type: editRuleType,
        description: editDescription.trim(),
        configuration: {},
        is_active: editIsActive,
      });

      setEditingRule(null);
      setMessage("Validation rule updated successfully!");

      await loadRules();
    } catch (error) {
      console.error("Failed to update validation rule:", error);
      setEditError(
        "Failed to update validation rule. Please check the backend API."
      );
    } finally {
      setUpdating(false);
    }
  }

  // Find dataset name for a rule
  function getDatasetName(id: number) {
    return (
      datasets.find((dataset) => dataset.id === id)?.name ??
      `Dataset #${id}`
    );
  }

  return (
    <PageContainer>
      {/* Page Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            Validation Rules
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Create and manage data quality validation rules.
          </p>
        </div>

        <Button onClick={openModal}>+ Create Rule</Button>
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

      {/* Create Rule Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title="Create Validation Rule"
        description="Select a dataset and configure its validation rule."
        size="lg"
      >
        <form onSubmit={handleCreateRule} className="space-y-5">
          <div className="w-full flex gap-16">
            <label
              htmlFor="rule-dataset"
              className="mt-2.5 block text-sm font-medium text-slate-700 text-nowrap"
            >
              Dataset
            </label>

            <select
              id="rule-dataset"
              value={datasetId}
              onChange={(event) => setDatasetId(event.target.value)}
              required
              disabled={datasetsLoading || datasets.length === 0}
              className="ml-5.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
            >
              <option value="">
                {datasetsLoading ? "Loading datasets..." : "Select a dataset"}
              </option>

              {datasets.map((dataset) => (
                <option key={dataset.id} value={dataset.id}>
                  {dataset.name}
                </option>
              ))}
            </select>

            {!datasetsLoading && datasets.length === 0 && (
              <p className="mt-2 text-sm text-amber-600">
                No datasets found. Create a dataset first.
              </p>
            )}
          </div>

          <Input
            label="Rule Name"
            placeholder="Example: Customer Email Check"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />

          <div className="w-full flex gap-16">
            <label
              htmlFor="rule-type"
              className="mt-2.5 block text-sm font-medium text-slate-700 text-nowrap"
            >
              Rule Type
            </label>

            <select
              id="rule-type"
              value={ruleType}
              onChange={(event) => setRuleType(event.target.value)}
              required
              className="ml-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              {RULE_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="rule-description"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Description
            </label>

            <textarea
              id="rule-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Describe what this rule checks"
              rows={3}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {formError && (
            <p
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600"
            >
              {formError}
            </p>
          )}

          <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={closeModal}
              disabled={saving}
            >
              Cancel
            </Button>

            <Button
              type="submit"
              loading={saving}
              disabled={
                saving || datasetsLoading || datasets.length === 0
              }
            >
              {saving ? "Creating..." : "Create Rule"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Rule Modal */}
      <Modal
        isOpen={editingRule !== null}
        onClose={closeEditModal}
        title="Edit Validation Rule"
        description="Update the selected validation rule."
        size="lg"
      >
        <form onSubmit={handleUpdateRule} className="space-y-5">
          <div className="w-full flex gap-16">
            <label
              htmlFor="edit-rule-dataset"
              className="mt-2.5 block text-sm font-medium text-slate-700 text-nowrap"
            >
              Dataset
            </label>

            <select
              id="edit-rule-dataset"
              value={editDatasetId}
              onChange={(event) => setEditDatasetId(event.target.value)}
              required
              disabled={datasetsLoading || datasets.length === 0}
              className="ml-5.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
            >
              <option value="">Select a dataset</option>

              {datasets.map((dataset) => (
                <option key={dataset.id} value={dataset.id}>
                  {dataset.name}
                </option>
              ))}
            </select>
          </div>

          <Input
            label="Rule Name"
            placeholder="Enter rule name"
            value={editName}
            onChange={(event) => setEditName(event.target.value)}
            required
          />

          <div className="w-full flex gap-16">
            <label
              htmlFor="edit-rule-type"
              className="mt-2.5 block text-sm font-medium text-slate-700 text-nowrap"
            >
              Rule Type
            </label>

            <select
              id="edit-rule-type"
              value={editRuleType}
              onChange={(event) => setEditRuleType(event.target.value)}
              required
              className="ml-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              {RULE_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="edit-rule-description"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Description
            </label>

            <textarea
              id="edit-rule-description"
              value={editDescription}
              onChange={(event) => setEditDescription(event.target.value)}
              placeholder="Describe what this rule checks"
              rows={3}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
            <div>
              <p className="text-sm font-medium text-slate-700">
                Rule Status
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Enable or disable this validation rule.
              </p>
            </div>

            <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={editIsActive}
                onChange={(event) => setEditIsActive(event.target.checked)}
                className="h-4 w-4 accent-blue-600"
              />
              {editIsActive ? "Active" : "Inactive"}
            </label>
          </div>

          {editError && (
            <p
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600"
            >
              {editError}
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
              disabled={updating || datasetsLoading || datasets.length === 0}
            >
              {updating ? "Updating..." : "Update Rule"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Loading / Error / Empty / Table */}
      {loading ? (
        <Loader message="Loading validation rules..." />
      ) : pageError ? (
        <div className="rounded-xl border border-red-200 bg-white p-6">
          <p role="alert" className="text-sm text-red-600">
            {pageError}
          </p>

          <Button
            className="mt-4"
            onClick={() => void loadRules()}
          >
            Try Again
          </Button>
        </div>
      ) : rules.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white">
          <EmptyState
            title="No validation rules found"
            description="Create your first validation rule using the Create Rule button."
          />
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-5 py-4 font-medium">Rule Name</th>
                <th className="px-5 py-4 font-medium">Dataset</th>
                <th className="px-5 py-4 font-medium">Rule Type</th>
                <th className="px-5 py-4 font-medium">Description</th>
                <th className="px-5 py-4 font-medium">Status</th>
                <th className="px-5 py-4 text-center font-medium">Actions</th>
              </tr>
            </thead>

            <tbody>
              {rules.map((rule) => (
                <tr
                  key={rule.id}
                  className="border-t border-slate-100 transition hover:bg-slate-50"
                >
                  <td className="px-5 py-4 font-medium text-slate-800">
                    {rule.name}
                  </td>

                  <td className="px-5 py-4 text-slate-600">
                    {getDatasetName(rule.dataset_id)}
                  </td>

                  <td className="px-5 py-4 text-slate-600">
                    {RULE_TYPES.find(
                      (type) => type.value === rule.rule_type
                    )?.label ?? rule.rule_type}
                  </td>

                  <td className="px-5 py-4 text-slate-600">
                    {rule.description || "—"}
                  </td>

                  <td className="px-5 py-4">
                    <Badge
                      status={rule.is_active ? "success" : "neutral"}
                    >
                      {rule.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </td>

                  <td className="px-5 py-4 text-center">
                    <button
                      type="button"
                      onClick={() => openEditModal(rule)}
                      title="Edit validation rule"
                      aria-label={`Edit ${rule.name}`}
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
    </PageContainer>
  );
}
