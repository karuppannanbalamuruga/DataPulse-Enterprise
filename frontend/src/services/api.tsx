
import api from "./axiosConfig";

import type {
  Dataset,
  CreateDatasetPayload,
} from "../types/dataset";

import type {
  ValidationRule,
  CreateValidationRulePayload,
} from "../types/validationRule";

import type { ProcessingRun } from "../types/processingRun";

// =====================================================
// 1. DATASET APIs
// Purpose: Create and retrieve datasets
// Backend: /api/v1/datasets
// =====================================================

// GET: Retrieve all datasets
export const getDatasets = async (): Promise<Dataset[]> => {
  const response = await api.get<Dataset[]>("/api/v1/datasets");
  return response.data;
};

// POST: Create a new dataset
export const createDataset = async (
  payload: CreateDatasetPayload,
): Promise<Dataset> => {
  const response = await api.post<Dataset>(
    "/api/v1/datasets",
    payload,
  );
  return response.data;
};

// =====================================================
// 2. VALIDATION RULE APIs
// Purpose: Create and retrieve validation rules
// Backend: /api/v1/validation-rules
// =====================================================

// GET: Retrieve all validation rules
export const getValidationRules = async (): Promise<
  ValidationRule[]
> => {
  const response = await api.get<ValidationRule[]>(
    "/api/v1/validation-rules",
  );
  return response.data;
};

// POST: Create a new validation rule
export const createValidationRule = async (
  payload: CreateValidationRulePayload,
): Promise<ValidationRule> => {
  const response = await api.post<ValidationRule>(
    "/api/v1/validation-rules",
    payload,
  );
  return response.data;
};

// =====================================================
// 3. ORGANIZATION APIs
// Purpose: Create and retrieve organizations
// Backend: /api/v1/organizations
// =====================================================

// GET: Retrieve all organizations
export const getOrganizations = async () => {
  const response = await api.get("/api/v1/organizations");
  return response.data;
};

// POST: Create a new organization
export const createOrganization = async (payload: {
  name: string;
  slug: string;
}) => {
  const response = await api.post(
    "/api/v1/organizations",
    payload,
  );
  return response.data;
};

// =====================================================
// 4. PROCESSING RUN APIs
// Purpose: Retrieve dataset processing history
// Backend: /api/v1/processing-runs
// =====================================================

// GET: Retrieve all processing runs
export const getProcessingRuns = async (): Promise<ProcessingRun[]> => {
  const response = await api.get<ProcessingRun[]>(
    "/api/v1/processing-runs",
  );

  return response.data;
};

// PROCESSING RUN APIs
export const createProcessingRun = async (
  datasetId: number,
): Promise<ProcessingRun> => {
  const response = await api.post<ProcessingRun>(
    "/api/v1/processing-runs",
    null,
    {
      params: {
        dataset_id: datasetId,
      },
    },
  );

  return response.data;
};

