import { useCallback, useEffect, useState, type FormEvent } from "react";

import PageContainer from "../components/layout/PageContainer";
import Button from "../components/common/Button";
import Input from "../components/common/Input";
import Loader from "../components/common/Loader";
import EmptyState from "../components/common/EmptyState";
import Badge from "../components/common/Badge";
import Modal from "../components/common/Model";
import Toast, { type ToastType } from "../components/common/Toast";

import {
  getDatasets,
  getValidationRules,
  createValidationRule,
  updateValidationRule,
  updateValidationRuleStatus,
  deleteValidationRule,
} from "../services/api";

import type { Dataset } from "../types/dataset";
import type {
  ValidationRule,
  CreateValidationRulePayload,
} from "../types/validationRule";

const RULE_TYPES = [
  { value: "required_field", label: "Required Field" },
  { value: "unique_value", label: "Unique Value" },
  { value: "data_type", label: "Data Type" },
  { value: "numeric_range", label: "Numeric Range" },
  { value: "string_length", label: "String Length" },
  { value: "format_validation", label: "Format Validation" },
];

const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

const labelClass = "mb-1.5 block text-sm font-medium text-slate-700";

type Configuration = Record<string, unknown>;

function getConfiguration(
  ruleType: string,
  expectedType: string,
  minValue: string,
  maxValue: string,
  minLength: string,
  maxLength: string,
  selectedFormat: string,
): Configuration {
  switch (ruleType) {
    case "data_type":
      return { expected_type: expectedType };

    case "numeric_range":
      return {
        min: Number(minValue),
        max: Number(maxValue),
      };

    case "string_length":
      return {
        min_length: Number(minLength),
        max_length: Number(maxLength),
      };

    case "format_validation":
      return { format: selectedFormat };

    default:
      return {};
  }
}

function getErrorMessage(error: unknown): string {
  const err = error as {
    response?: {
      data?: {
        detail?: string | { msg?: string }[];
      };
    };
    message?: string;
  };

  const detail = err?.response?.data?.detail;

  if (typeof detail === "string") return detail;

  if (Array.isArray(detail)) {
    return detail.map((item) => item.msg ?? "Invalid input").join(", ");
  }

  return err?.message ?? "Something went wrong. Please try again.";
}

export default function ValidationRules() {
  const [rules, setRules] = useState<ValidationRule[]>([]);
  const [datasets, setDatasets] = useState<Dataset[]>([]);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDatasetFilter, setSelectedDatasetFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalRules, setTotalRules] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const [loading, setLoading] = useState(true);
  const [datasetsLoading, setDatasetsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [statusUpdatingId, setStatusUpdatingId] = useState<number | null>(null);

  const [pageError, setPageError] = useState("");
  const [formError, setFormError] = useState("");
  const [editError, setEditError] = useState("");

  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<ToastType>("success");

  // Create form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [datasetId, setDatasetId] = useState("");
  const [name, setName] = useState("");
  const [ruleType, setRuleType] = useState("required_field");
  const [description, setDescription] = useState("");

  const [expectedType, setExpectedType] = useState("string");
  const [minValue, setMinValue] = useState("0");
  const [maxValue, setMaxValue] = useState("100");
  const [minLength, setMinLength] = useState("1");
  const [maxLength, setMaxLength] = useState("255");
  const [selectedFormat, setSelectedFormat] = useState("email");

  // View state
  const [viewingRule, setViewingRule] = useState<ValidationRule | null>(null);

  // Edit form state
  const [editingRule, setEditingRule] = useState<ValidationRule | null>(null);
  const [editDatasetId, setEditDatasetId] = useState("");
  const [editName, setEditName] = useState("");
  const [editRuleType, setEditRuleType] = useState("required_field");
  const [editDescription, setEditDescription] = useState("");
  const [editIsActive, setEditIsActive] = useState(true);

  const [editExpectedType, setEditExpectedType] = useState("string");
  const [editMinValue, setEditMinValue] = useState("0");
  const [editMaxValue, setEditMaxValue] = useState("100");
  const [editMinLength, setEditMinLength] = useState("1");
  const [editMaxLength, setEditMaxLength] = useState("255");
  const [editSelectedFormat, setEditSelectedFormat] = useState("email");

  const showToast = (message: string, type: ToastType = "success") => {
    setToastMessage(message);
    setToastType(type);
  };

  const loadRules = useCallback(async () => {
    try {
      setLoading(true);
      setPageError("");

      const response = await getValidationRules({
        page: currentPage,
        page_size: pageSize,
        search: searchTerm.trim() || undefined,
        dataset_id:
          selectedDatasetFilter === "all"
            ? undefined
            : Number(selectedDatasetFilter),
      });

      setRules(response.items);
      setTotalRules(response.total);
      setTotalPages(response.total_pages);
    } catch (error) {
      console.error("Failed to load validation rules:", error);
      setPageError(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, searchTerm, selectedDatasetFilter]);

  const loadDatasets = useCallback(async () => {
    try {
      setDatasetsLoading(true);
      const response = await getDatasets();
      setDatasets(response.items);
    } catch (error) {
      console.error("Failed to load datasets:", error);
      showToast(getErrorMessage(error), "error");
    } finally {
      setDatasetsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRules();
  }, [loadRules]);

  useEffect(() => {
    void loadDatasets();
  }, [loadDatasets]);

  function getDatasetName(id: number) {
    return (
      datasets.find((dataset) => dataset.id === id)?.name ?? `Dataset #${id}`
    );
  }

  function resetCreateForm() {
    setDatasetId("");
    setName("");
    setRuleType("required_field");
    setDescription("");
    setExpectedType("string");
    setMinValue("0");
    setMaxValue("100");
    setMinLength("1");
    setMaxLength("255");
    setSelectedFormat("email");
    setFormError("");
  }

  function openCreateModal() {
    resetCreateForm();
    setIsModalOpen(true);
  }

  function closeCreateModal() {
    if (saving) return;
    setIsModalOpen(false);
    setFormError("");
  }

  function validateConfiguration(
    type: string,
    min: string,
    max: string,
    minimumLength: string,
    maximumLength: string,
  ): string | null {
    if (type === "numeric_range") {
      if (min.trim() === "" || max.trim() === "") {
        return "Enter both minimum and maximum values.";
      }

      if (!Number.isFinite(Number(min)) || !Number.isFinite(Number(max))) {
        return "Range values must be valid numbers.";
      }

      if (Number(min) > Number(max)) {
        return "Minimum value cannot be greater than maximum value.";
      }
    }

    if (type === "string_length") {
      if (minimumLength.trim() === "" || maximumLength.trim() === "") {
        return "Enter both minimum and maximum lengths.";
      }

      if (
        !Number.isInteger(Number(minimumLength)) ||
        !Number.isInteger(Number(maximumLength))
      ) {
        return "String lengths must be whole numbers.";
      }

      if (
        Number(minimumLength) < 0 ||
        Number(maximumLength) < Number(minimumLength)
      ) {
        return "Enter valid minimum and maximum lengths.";
      }
    }

    return null;
  }

  async function handleCreateRule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");

    if (!datasetId) {
      setFormError("Please select a dataset.");
      return;
    }

    if (!name.trim()) {
      setFormError("Please enter a rule name.");
      return;
    }

    const validationError = validateConfiguration(
      ruleType,
      minValue,
      maxValue,
      minLength,
      maxLength,
    );

    if (validationError) {
      setFormError(validationError);
      return;
    }

    const payload: CreateValidationRulePayload = {
      dataset_id: Number(datasetId),
      name: name.trim(),
      rule_type: ruleType,
      description: description.trim() || null,
      configuration: getConfiguration(
        ruleType,
        expectedType,
        minValue,
        maxValue,
        minLength,
        maxLength,
        selectedFormat,
      ),
      is_active: true,
    };

    try {
      setSaving(true);
      await createValidationRule(payload);

      setIsModalOpen(false);
      resetCreateForm();

      showToast("Validation rule created successfully!");
      setCurrentPage(1);

      // Refresh the current list using the active filters.
      await loadRules();
    } catch (error) {
      console.error("Failed to create validation rule:", error);
      setFormError(getErrorMessage(error));
      showToast("Failed to create validation rule.", "error");
    } finally {
      setSaving(false);
    }
  }

  function openEditModal(rule: ValidationRule) {
    const config = rule.configuration ?? {};

    setEditingRule(rule);
    setEditDatasetId(String(rule.dataset_id));
    setEditName(rule.name);
    setEditRuleType(rule.rule_type);
    setEditDescription(rule.description ?? "");
    setEditIsActive(rule.is_active);

    setEditExpectedType(String(config.expected_type ?? "string"));
    setEditMinValue(String(config.min ?? 0));
    setEditMaxValue(String(config.max ?? 100));
    setEditMinLength(String(config.min_length ?? 1));
    setEditMaxLength(String(config.max_length ?? 255));
    setEditSelectedFormat(String(config.format ?? "email"));

    setEditError("");
  }

  function closeEditModal() {
    if (updating) return;
    setEditingRule(null);
    setEditError("");
  }

  async function handleUpdateRule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!editingRule) return;

    setEditError("");

    if (!editDatasetId || !editName.trim()) {
      setEditError("Dataset and rule name are required.");
      return;
    }

    const validationError = validateConfiguration(
      editRuleType,
      editMinValue,
      editMaxValue,
      editMinLength,
      editMaxLength,
    );

    if (validationError) {
      setEditError(validationError);
      return;
    }

    try {
      setUpdating(true);

      await updateValidationRule(editingRule.id, {
        dataset_id: Number(editDatasetId),
        name: editName.trim(),
        rule_type: editRuleType,
        description: editDescription.trim() || null,
        configuration: getConfiguration(
          editRuleType,
          editExpectedType,
          editMinValue,
          editMaxValue,
          editMinLength,
          editMaxLength,
          editSelectedFormat,
        ),
        is_active: editIsActive,
      });

      setEditingRule(null);
      showToast("Validation rule updated successfully!");
      await loadRules();
    } catch (error) {
      console.error("Failed to update validation rule:", error);
      setEditError(getErrorMessage(error));
      showToast("Failed to update validation rule.", "error");
    } finally {
      setUpdating(false);
    }
  }

  async function handleToggleStatus(rule: ValidationRule) {
    try {
      setStatusUpdatingId(rule.id);

      const updatedRule = await updateValidationRuleStatus(
        rule.id,
        !rule.is_active,
      );

      setRules((previousRules) =>
        previousRules.map((item) => (item.id === rule.id ? updatedRule : item)),
      );

      if (viewingRule?.id === rule.id) {
        setViewingRule(updatedRule);
      }

      showToast(
        `Rule ${updatedRule.is_active ? "activated" : "deactivated"} successfully!`,
      );
    } catch (error) {
      console.error("Failed to update rule status:", error);
      showToast(getErrorMessage(error), "error");
    } finally {
      setStatusUpdatingId(null);
    }
  }

  async function handleDeleteRule(rule: ValidationRule) {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${rule.name}"?`,
    );

    if (!confirmed) return;

    try {
      setDeletingId(rule.id);

      await deleteValidationRule(rule.id);

      showToast("Validation rule deleted successfully!");

      if (rules.length === 1 && currentPage > 1) {
        setCurrentPage((page) => page - 1);
      } else {
        await loadRules();
      }
    } catch (error) {
      console.error("Failed to delete validation rule:", error);
      showToast(getErrorMessage(error), "error");
    } finally {
      setDeletingId(null);
    }
  }

  function renderConfigurationFields(isEdit = false) {
    const type = isEdit ? editRuleType : ruleType;

    const currentExpectedType = isEdit ? editExpectedType : expectedType;
    const setCurrentExpectedType = isEdit
      ? setEditExpectedType
      : setExpectedType;

    const currentMin = isEdit ? editMinValue : minValue;
    const setCurrentMin = isEdit ? setEditMinValue : setMinValue;

    const currentMax = isEdit ? editMaxValue : maxValue;
    const setCurrentMax = isEdit ? setEditMaxValue : setMaxValue;

    const currentMinLength = isEdit ? editMinLength : minLength;
    const setCurrentMinLength = isEdit ? setEditMinLength : setMinLength;

    const currentMaxLength = isEdit ? editMaxLength : maxLength;
    const setCurrentMaxLength = isEdit ? setEditMaxLength : setMaxLength;

    const currentFormat = isEdit ? editSelectedFormat : selectedFormat;
    const setCurrentFormat = isEdit ? setEditSelectedFormat : setSelectedFormat;

    if (type === "data_type") {
      return (
        <div>
          <label
            className={labelClass}
            htmlFor={`${isEdit ? "edit-" : ""}expected-type`}
          >
            Expected Data Type
          </label>
          <select
            id={`${isEdit ? "edit-" : ""}expected-type`}
            className={inputClass}
            value={currentExpectedType}
            onChange={(event) => setCurrentExpectedType(event.target.value)}
          >
            <option value="string">String</option>
            <option value="integer">Integer</option>
            <option value="number">Number</option>
            <option value="boolean">Boolean</option>
            <option value="date">Date</option>
          </select>
        </div>
      );
    }

    if (type === "numeric_range") {
      return (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label
              className={labelClass}
              htmlFor={`${isEdit ? "edit-" : ""}min-value`}
            >
              Minimum Value
            </label>
            <input
              id={`${isEdit ? "edit-" : ""}min-value`}
              className={inputClass}
              type="number"
              value={currentMin}
              onChange={(event) => setCurrentMin(event.target.value)}
              required
            />
          </div>
          <div>
            <label
              className={labelClass}
              htmlFor={`${isEdit ? "edit-" : ""}max-value`}
            >
              Maximum Value
            </label>
            <input
              id={`${isEdit ? "edit-" : ""}max-value`}
              className={inputClass}
              type="number"
              value={currentMax}
              onChange={(event) => setCurrentMax(event.target.value)}
              required
            />
          </div>
        </div>
      );
    }

    if (type === "string_length") {
      return (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label
              className={labelClass}
              htmlFor={`${isEdit ? "edit-" : ""}min-length`}
            >
              Minimum Length
            </label>
            <input
              id={`${isEdit ? "edit-" : ""}min-length`}
              className={inputClass}
              type="number"
              min={0}
              step={1}
              value={currentMinLength}
              onChange={(event) => setCurrentMinLength(event.target.value)}
              required
            />
          </div>
          <div>
            <label
              className={labelClass}
              htmlFor={`${isEdit ? "edit-" : ""}max-length`}
            >
              Maximum Length
            </label>
            <input
              id={`${isEdit ? "edit-" : ""}max-length`}
              className={inputClass}
              type="number"
              min={0}
              step={1}
              value={currentMaxLength}
              onChange={(event) => setCurrentMaxLength(event.target.value)}
              required
            />
          </div>
        </div>
      );
    }

    if (type === "format_validation") {
      return (
        <div>
          <label
            className={labelClass}
            htmlFor={`${isEdit ? "edit-" : ""}format-type`}
          >
            Format
          </label>
          <select
            id={`${isEdit ? "edit-" : ""}format-type`}
            className={inputClass}
            value={currentFormat}
            onChange={(event) => setCurrentFormat(event.target.value)}
          >
            <option value="email">Email</option>
            <option value="phone">Phone</option>
            <option value="url">URL</option>
          </select>
        </div>
      );
    }

    if (type === "required_field") {
      return (
        <p className="rounded-lg bg-blue-50 p-3 text-sm text-blue-800">
          This rule checks that the selected field has a value. No additional
          configuration is required.
        </p>
      );
    }

    if (type === "unique_value") {
      return (
        <p className="rounded-lg bg-blue-50 p-3 text-sm text-blue-800">
          This rule checks that values are unique. No additional configuration
          is required.
        </p>
      );
    }

    return null;
  }

  function renderRuleTypeSelect(isEdit = false) {
    const value = isEdit ? editRuleType : ruleType;
    const setValue = isEdit ? setEditRuleType : setRuleType;
    const id = isEdit ? "edit-rule-type" : "rule-type";

    return (
      <div>
        <label className={labelClass} htmlFor={id}>
          Rule Type
        </label>
        <select
          id={id}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          className={inputClass}
          required
        >
          {RULE_TYPES.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <PageContainer>
      <Toast
        message={toastMessage}
        type={toastType}
        duration={4000}
        onClose={() => setToastMessage("")}
      />

      {/* Page header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Validation Rules</h2>
          <p className="mt-1 text-sm text-slate-500">
            Create and manage data quality validation rules.
          </p>
        </div>

        <Button onClick={openCreateModal}>+ Create Rule</Button>
      </div>

      {/* Create modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeCreateModal}
        title="Create Validation Rule"
        description="Select a dataset and configure the validation rule."
        size="lg"
      >
        <form onSubmit={handleCreateRule} className="space-y-5">
          <div>
            <label className={labelClass} htmlFor="rule-dataset">
              Dataset
            </label>
            <select
              id="rule-dataset"
              className={inputClass}
              value={datasetId}
              onChange={(event) => setDatasetId(event.target.value)}
              disabled={datasetsLoading || datasets.length === 0}
              required
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

          <div>
            <Input
              label="Rule Name"
              placeholder="Example: Customer Email Check"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
          </div>

          {renderRuleTypeSelect()}
          {renderConfigurationFields()}

          <div>
            <label className={labelClass} htmlFor="rule-description">
              Description
            </label>
            <textarea
              id="rule-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Describe what this rule checks"
              rows={3}
              className={inputClass}
            />
          </div>

          {formError && (
            <p
              role="alert"
              className="rounded-lg bg-red-50 p-3 text-sm text-red-700"
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
              disabled={saving || datasetsLoading || datasets.length === 0}
            >
              {saving ? "Creating..." : "Create Rule"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* View modal */}
      <Modal
        isOpen={viewingRule !== null}
        onClose={() => setViewingRule(null)}
        title="Validation Rule Details"
        description="View validation rule information."
        size="lg"
      >
        {viewingRule && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs uppercase text-slate-500">Rule Name</p>
                <p className="mt-1 break-words text-sm font-semibold text-slate-900">
                  {viewingRule.name}
                </p>
              </div>

              <div>
                <p className="text-xs uppercase text-slate-500">Dataset</p>
                <p className="mt-1 text-sm text-slate-800">
                  {getDatasetName(viewingRule.dataset_id)}
                </p>
              </div>

              <div>
                <p className="text-xs uppercase text-slate-500">Rule Type</p>
                <p className="mt-1 text-sm text-slate-800">
                  {RULE_TYPES.find(
                    (item) => item.value === viewingRule.rule_type,
                  )?.label ?? viewingRule.rule_type}
                </p>
              </div>

              <div>
                <p className="text-xs uppercase text-slate-500">Status</p>
                <div className="mt-1">
                  <Badge status={viewingRule.is_active ? "success" : "neutral"}>
                    {viewingRule.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </div>

              <div className="sm:col-span-2">
                <p className="text-xs uppercase text-slate-500">Description</p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-slate-800">
                  {viewingRule.description || "No description provided."}
                </p>
              </div>

              <div className="sm:col-span-2">
                <p className="text-xs uppercase text-slate-500">
                  Configuration
                </p>
                <pre className="mt-1 overflow-x-auto rounded-lg bg-slate-50 p-3 text-xs text-slate-800">
                  {JSON.stringify(viewingRule.configuration ?? {}, null, 2)}
                </pre>
              </div>

              {viewingRule.created_at && (
                <div className="sm:col-span-2">
                  <p className="text-xs uppercase text-slate-500">Created At</p>
                  <p className="mt-1 text-sm text-slate-800">
                    {new Date(viewingRule.created_at).toLocaleString()}
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end border-t border-slate-100 pt-4">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setViewingRule(null)}
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Edit modal */}
      <Modal
        isOpen={editingRule !== null}
        onClose={closeEditModal}
        title="Edit Validation Rule"
        description="Update the selected validation rule."
        size="lg"
      >
        <form onSubmit={handleUpdateRule} className="space-y-5">
          <div>
            <label className={labelClass} htmlFor="edit-dataset">
              Dataset
            </label>
            <select
              id="edit-dataset"
              className={inputClass}
              value={editDatasetId}
              onChange={(event) => setEditDatasetId(event.target.value)}
              required
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

          {renderRuleTypeSelect(true)}
          {renderConfigurationFields(true)}

          <div>
            <label className={labelClass} htmlFor="edit-description">
              Description
            </label>
            <textarea
              id="edit-description"
              className={inputClass}
              value={editDescription}
              onChange={(event) => setEditDescription(event.target.value)}
              placeholder="Describe what this rule checks"
              rows={3}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
            <div>
              <p className="text-sm font-medium text-slate-700">Rule Status</p>
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
              className="rounded-lg bg-red-50 p-3 text-sm text-red-700"
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
            <Button type="submit" loading={updating} disabled={updating}>
              {updating ? "Updating..." : "Update Rule"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Search and filters */}
      <div className="mb-4 grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-[minmax(0,1fr)_240px_130px]">
        <div>
          <label className={labelClass} htmlFor="rule-search">
            Search validation rules
          </label>
          <input
            id="rule-search"
            type="search"
            className={inputClass}
            value={searchTerm}
            onChange={(event) => {
              setSearchTerm(event.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search name, description or type..."
          />
        </div>

        <div>
          <label className={labelClass} htmlFor="dataset-filter">
            Filter by dataset
          </label>
          <select
            id="dataset-filter"
            className={inputClass}
            value={selectedDatasetFilter}
            onChange={(event) => {
              setSelectedDatasetFilter(event.target.value);
              setCurrentPage(1);
            }}
            disabled={datasetsLoading}
          >
            <option value="all">All datasets</option>
            {datasets.map((dataset) => (
              <option key={dataset.id} value={dataset.id}>
                {dataset.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClass} htmlFor="page-size">
            Rows per page
          </label>
          <select
            id="page-size"
            className={inputClass}
            value={pageSize}
            onChange={(event) => {
              setPageSize(Number(event.target.value));
              setCurrentPage(1);
            }}
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
        </div>
      </div>

      {/* Table states */}
      {loading ? (
        <Loader message="Loading validation rules..." />
      ) : pageError ? (
        <div className="rounded-xl border border-red-200 bg-white p-6">
          <p role="alert" className="text-sm text-red-600">
            {pageError}
          </p>
          <Button className="mt-4" onClick={() => void loadRules()}>
            Try Again
          </Button>
        </div>
      ) : rules.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white">
          <EmptyState
            title="No validation rules found"
            description={
              searchTerm.trim() || selectedDatasetFilter !== "all"
                ? "Try changing the search text or dataset filter."
                : "Create your first validation rule."
            }
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
                  className="border-t border-slate-100 hover:bg-slate-50"
                >
                  <td className="px-5 py-4 font-medium text-slate-800">
                    {rule.name}
                  </td>
                  <td className="px-5 py-4 text-slate-600">
                    {getDatasetName(rule.dataset_id)}
                  </td>
                  <td className="px-5 py-4 text-slate-600">
                    {RULE_TYPES.find((item) => item.value === rule.rule_type)
                      ?.label ?? rule.rule_type}
                  </td>
                  <td className="px-5 py-4 text-slate-600">
                    {rule.description || "—"}
                  </td>
                  <td className="px-5 py-4">
                    <Badge status={rule.is_active ? "success" : "neutral"}>
                      {rule.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={rule.is_active}
                        aria-label={`${rule.is_active ? "Deactivate" : "Activate"} ${rule.name}`}
                        title={
                          rule.is_active ? "Deactivate rule" : "Activate rule"
                        }
                        disabled={
                          statusUpdatingId === rule.id || deletingId === rule.id
                        }
                        onClick={() => void handleToggleStatus(rule)}
                        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${
                          rule.is_active ? "bg-emerald-500" : "bg-slate-300"
                        }`}
                      >
                        <span
                          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                            rule.is_active ? "translate-x-5" : "translate-x-0.5"
                          }`}
                        />
                      </button>
                      <button
                        onClick={() => setViewingRule(rule)}
                        title="View Validation Rules"
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
                        onClick={() => openEditModal(rule)}
                        title="Edit Validation Rules"
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
                        disabled={
                          deletingId === rule.id || statusUpdatingId === rule.id
                        }
                        onClick={() => void handleDeleteRule(rule)}
                        title="Delete Validation Rules"
                        aria-label={`Delete Validation Rules`}
                        className="inline-flex items-center justify-center rounded-lg border border-red-200 bg-red-50 p-2 text-red-700 transition hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-300"
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
                          <path d="M3 6h18" />
                          <path d="M8 6V4h8v2" />
                          <path d="m19 6-1 14H6L5 6" />
                          <path d="M10 11v5M14 11v5" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {!loading && !pageError && totalRules > 0 && (
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-500">
            Showing {Math.min((currentPage - 1) * pageSize + 1, totalRules)}–
            {Math.min(currentPage * pageSize, totalRules)} of {totalRules} rules
          </p>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              disabled={currentPage <= 1 || loading}
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
            >
              Previous
            </Button>
            <span className="px-2 text-sm text-slate-600">
              Page {currentPage} of {Math.max(totalPages, 1)}
            </span>
            <Button
              variant="secondary"
              disabled={
                currentPage >= totalPages || loading || totalPages === 0
              }
              onClick={() =>
                setCurrentPage((page) =>
                  Math.min(Math.max(totalPages, 1), page + 1),
                )
              }
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </PageContainer>
  );
}
