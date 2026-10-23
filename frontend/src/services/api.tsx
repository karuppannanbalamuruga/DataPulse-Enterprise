
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

import type {
  ProcessingRun,
  ProcessingRunsResponse,
  ProcessingRunQueryParams,
  UpdateProcessingRunPayload,
} from "../types/processingRun";

// =====================================================
// 1. DATASET APIs
// =====================================================

export const getDatasets = async (
  params: DatasetQueryParams = {},
): Promise<DatasetListResponse> => {
  const response = await api.get<DatasetListResponse>(
    "/api/v1/datasets",
    { params },
  );

  return response.data;
};

export const getDataset = async (id: number): Promise<Dataset> => {
  const response = await api.get<Dataset>(
    `/api/v1/datasets/${id}`,
  );

  return response.data;
};

export const createDataset = async (
  payload: CreateDatasetPayload,
): Promise<Dataset> => {
  const response = await api.post<Dataset>(
    "/api/v1/datasets",
    payload,
  );

  return response.data;
};

export const updateDataset = async (
  id: number,
  payload: UpdateDatasetPayload,
): Promise<Dataset> => {
  const response = await api.patch<Dataset>(
    `/api/v1/datasets/${id}`,
    payload,
  );

  return response.data;
};

// =====================================================
// 2. VALIDATION RULE APIs
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

export const getValidationRule = async (
  id: number,
): Promise<ValidationRule> => {
  const response = await api.get<ValidationRule>(
    `/api/v1/validation-rules/${id}`,
  );

  return response.data;
};

export const createValidationRule = async (
  payload: CreateValidationRulePayload,
): Promise<ValidationRule> => {
  const response = await api.post<ValidationRule>(
    "/api/v1/validation-rules",
    payload,
  );

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
  const response = await api.get(
    "/api/v1/organizations",
  );

  return response.data;
};

export const createOrganization = async (
  payload: { name: string; slug: string },
) => {
  const response = await api.post(
    "/api/v1/organizations",
    payload,
  );

  return response.data;
};

export const updateOrganization = async (
  id: number,
  payload: { name: string; slug: string },
) => {
  const response = await api.put(
    `/api/v1/organizations/${id}`,
    payload,
  );

  return response.data;
};

// =====================================================
// 4. PROCESSING RUN APIs
// =====================================================

// GET all processing runs with pagination
export const getProcessingRuns = async (
  params: ProcessingRunQueryParams = {},
): Promise<ProcessingRunsResponse> => {
  const response = await api.get<ProcessingRunsResponse>(
    "/api/v1/processing-runs",
    { params },
  );

  return response.data;
};

// GET processing run by ID
export const getProcessingRun = async (
  id: number,
): Promise<ProcessingRun> => {
  const response = await api.get<ProcessingRun>(
    `/api/v1/processing-runs/${id}`,
  );

  return response.data;
};

// CREATE processing run
export const createProcessingRun = async (
  datasetId: number,
): Promise<ProcessingRun> => {
  const response = await api.post<ProcessingRun>(
    "/api/v1/processing-runs",
    null,
    {
      params: { dataset_id: datasetId },
    },
  );

  return response.data;
};

// UPDATE processing run using PATCH
export const updateProcessingRun = async (
  id: number,
  payload: UpdateProcessingRunPayload,
): Promise<ProcessingRun> => {
  const response = await api.patch<ProcessingRun>(
    `/api/v1/processing-runs/${id}`,
    payload,
  );

  return response.data;
};
