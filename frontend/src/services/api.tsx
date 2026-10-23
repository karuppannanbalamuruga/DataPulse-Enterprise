import api from "./axiosConfig";

import type {
  Dataset,
  CreateDatasetPayload,
  UpdateDatasetPayload,
  DatasetListResponse,
  DatasetQueryParams,
} from "../types/dataset";

import type {
  ValidationRule,
  CreateValidationRulePayload,
  UpdateValidationRulePayload,
  ValidationRulesResponse,
  ValidationRuleQueryParams,
} from "../types/validationRule";

import type { ProcessingRun } from "../types/processingRun";

// =====================================================
// 1. DATASET APIs
// =====================================================
export const getDatasets = async (
  params: DatasetQueryParams = {},
): Promise<DatasetListResponse> => {
  const response = await api.get<DatasetListResponse>("/api/v1/datasets", { params });
  return response.data;
};

export const getDataset = async (id: number): Promise<Dataset> => {
  const response = await api.get<Dataset>(`/api/v1/datasets/${id}`);
  return response.data;
};

export const createDataset = async (payload: CreateDatasetPayload): Promise<Dataset> => {
  const response = await api.post<Dataset>("/api/v1/datasets", payload);
  return response.data;
};

export const updateDataset = async (
  id: number,
  payload: UpdateDatasetPayload,
): Promise<Dataset> => {
  const response = await api.patch<Dataset>(`/api/v1/datasets/${id}`, payload);
  return response.data;
};

// =====================================================
// 2. VALIDATION RULE APIs
// GET returns { items, total, page, page_size, total_pages }
// =====================================================
export const getValidationRules = async (
  params: ValidationRuleQueryParams = {},
): Promise<ValidationRulesResponse> => {
  const response = await api.get<ValidationRulesResponse>(
    "/api/v1/validation-rules",
    { params },
  );
  return response.data;
};

export const getValidationRule = async (id: number): Promise<ValidationRule> => {
  const response = await api.get<ValidationRule>(`/api/v1/validation-rules/${id}`);
  return response.data;
};

export const createValidationRule = async (
  payload: CreateValidationRulePayload,
): Promise<ValidationRule> => {
  const response = await api.post<ValidationRule>("/api/v1/validation-rules", payload);
  return response.data;
};

export const updateValidationRule = async (
  id: number,
  payload: UpdateValidationRulePayload,
): Promise<ValidationRule> => {
  const response = await api.patch<ValidationRule>(
    `/api/v1/validation-rules/${id}`,
    payload,
  );
  return response.data;
};

// =====================================================
// 3. ORGANIZATION APIs
// =====================================================
export const getOrganizations = async () => {
  const response = await api.get("/api/v1/organizations");
  return response.data;
};

export const createOrganization = async (payload: { name: string; slug: string }) => {
  const response = await api.post("/api/v1/organizations", payload);
  return response.data;
};

export const updateOrganization = async (
  id: number,
  payload: { name: string; slug: string },
) => {
  const response = await api.put(`/api/v1/organizations/${id}`, payload);
  return response.data;
};

// =====================================================
// 4. PROCESSING RUN APIs
// =====================================================
export const getProcessingRuns = async (): Promise<ProcessingRun[]> => {
  const response = await api.get<ProcessingRun[]>("/api/v1/processing-runs");
  return response.data;
};

export const createProcessingRun = async (datasetId: number): Promise<ProcessingRun> => {
  const response = await api.post<ProcessingRun>(
    "/api/v1/processing-runs",
    null,
    { params: { dataset_id: datasetId } },
  );
  return response.data;
};

export const updateProcessingRun = async (
  id: number,
  payload: {
    status?: string;
    records_processed?: number;
    error_message?: string | null;
    completed_at?: string | null;
  },
): Promise<ProcessingRun> => {
  const response = await api.put<ProcessingRun>(`/api/v1/processing-runs/${id}`, payload);
  return response.data;
};
