
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
  Organization,
  OrganizationListResponse,
  OrganizationQueryParams,
  CreateOrganizationPayload,
  UpdateOrganizationPayload,
} from "../types/organization";

import type {
  ProcessingRun,
  ProcessingRunsResponse,
  ProcessingRunQueryParams,
  UpdateProcessingRunPayload,
  ProcessingRunListResponse,
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
  const response = await api.get<Dataset>(`/api/v1/datasets/${id}`);
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

export const deleteDataset = async (id: number): Promise<void> => {
  await api.delete(`/api/v1/datasets/${id}`);
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

export const updateValidationRuleStatus = async (
  id: number,
  is_active: boolean,
): Promise<ValidationRule> => {
  const response = await api.patch<ValidationRule>(
    `/api/v1/validation-rules/${id}/status`,
    { is_active },
  );

  return response.data;
};

export const deleteValidationRule = async (
  id: number,
): Promise<void> => {
  await api.delete(`/api/v1/validation-rules/${id}`);
};

// =====================================================
// 3. ORGANIZATION APIs
// =====================================================

export const getOrganizations = async (
  params: OrganizationQueryParams = {},
): Promise<OrganizationListResponse> => {
  const response = await api.get<OrganizationListResponse>(
    "/api/v1/organizations",
    { params },
  );

  return response.data;
};

export const getOrganization = async (
  id: number,
): Promise<Organization> => {
  const response = await api.get<Organization>(
    `/api/v1/organizations/${id}`,
  );

  return response.data;
};

export const createOrganization = async (
  payload: CreateOrganizationPayload,
): Promise<Organization> => {
  const response = await api.post<Organization>(
    "/api/v1/organizations",
    payload,
  );

  return response.data;
};

export const updateOrganization = async (
  id: number,
  payload: UpdateOrganizationPayload,
): Promise<Organization> => {
  const response = await api.patch<Organization>(
    `/api/v1/organizations/${id}`,
    payload,
  );

  return response.data;
};

export const deleteOrganization = async (
  id: number,
): Promise<void> => {
  await api.delete(`/api/v1/organizations/${id}`);
};

// =====================================================
// 4. PROCESSING RUN APIs
// =====================================================

export const getProcessingRuns = async (
  params: ProcessingRunQueryParams = {},
): Promise<ProcessingRunsResponse> => {
  const response = await api.get<ProcessingRunsResponse>(
    "/api/v1/processing-runs",
    { params },
  );

  return response.data;
};

export const getProcessingRun = async (
  id: number,
): Promise<ProcessingRun> => {
  const response = await api.get<ProcessingRun>(
    `/api/v1/processing-runs/${id}`,
  );

  return response.data;
};

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

export const deleteProcessingRun = async (
  id: number,
): Promise<void> => {
  await api.delete(`/api/v1/processing-runs/${id}`);
};

export const getFailedProcessingRuns = async (
  page = 1,
  pageSize = 10,
): Promise<ProcessingRunListResponse> => {
  const response = await api.get<ProcessingRunListResponse>(
    "/api/v1/processing-runs/failed",
    {
      params: {
        page,
        page_size: pageSize,
      },
    },
  );

  return response.data;
};

// =====================================================
// 5. QUALITY SUMMARY API
// =====================================================

export interface QualitySummary {
  dataset_id: number;
  dataset_name: string;
  total_processing_runs: number;
  total_records_processed: number;
  total_rules_executed: number;
  total_passed_checks: number;
  total_failed_checks: number;
  quality_score: number;

  latest_run: {
    processing_run_id: number;
    status: string;
    records_processed: number;
    total_rules_executed: number;
    passed_checks: number;
    failed_checks: number;
    quality_score: number;
    started_at: string;
    completed_at: string | null;
  } | null;
}

export const getQualitySummary = async (
  datasetId: number,
): Promise<QualitySummary> => {
  const response = await api.get<QualitySummary>(
    `/api/v1/datasets/${datasetId}/quality-summary`,
  );

  return response.data;
};

// =====================================================
// 6. CSV UPLOAD API
// =====================================================

export interface CSVUploadResponse {
  message: string;
  dataset_id: number;
  filename: string;
  file_size: number;
  columns: string[];
  total_rows: number;
  uploaded_at: string;
}

export const uploadDatasetCSV = async (
  datasetId: number,
  file: File,
): Promise<CSVUploadResponse> => {
  const formData = new FormData();

  formData.append("file", file);

  const response = await api.post<CSVUploadResponse>(
    `/api/v1/datasets/${datasetId}/upload`,
    formData,
  );

  return response.data;
};

// =====================================================
// 7. EXECUTE VALIDATION API
// =====================================================

export interface ValidationResultItem {
  rule_id: number;
  column_name: string | null;
  total_checked: number;
  passed_count: number;
  failed_count: number;
  status: string;
}

export interface ValidationIssueItem {
  rule_id: number;
  row_number: number;
  column_name: string;
  invalid_value: string | null;
  error_description: string;
}

export interface ExecuteValidationResponse {
  processing_run_id: number;
  dataset_id: number;
  status: string;
  records_processed: number;
  total_rules_executed: number;
  passed_checks: number;
  failed_checks: number;
  quality_score: number;
  results: ValidationResultItem[];
  issues: ValidationIssueItem[];
}

export const executeDatasetValidation = async (
  datasetId: number,
): Promise<ExecuteValidationResponse> => {
  const response = await api.post<ExecuteValidationResponse>(
    `/api/v1/datasets/${datasetId}/execute`,
  );

  return response.data;
};
