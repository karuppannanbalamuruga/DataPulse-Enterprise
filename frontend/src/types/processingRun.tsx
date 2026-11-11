
export type ProcessingRunStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed";

export interface ProcessingRun {
  id: number;
  dataset_id: number;
  status: ProcessingRunStatus;

  // Processing metrics
  records_processed: number;
  total_rules_executed?: number;
  passed_checks?: number;
  failed_checks?: number;
  quality_score?: number | null;

  // Error details
  error_message?: string | null;

  // Timestamps
  started_at?: string | null;
  completed_at?: string | null;
}

export interface ProcessingRunsResponse {
  items: ProcessingRun[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}


export interface ProcessingRunQueryParams {
  page?: number;
  page_size?: number;
  search?: string;
  run_id?: number;
  dataset_id?: number;
  status?: ProcessingRunStatus;
  start_date?: string;
  end_date?: string;
  sort_by?: "execution_date" | "duration" | "quality_score";
  sort_order?: "asc" | "desc";
}


export interface UpdateProcessingRunPayload {
  status?: ProcessingRunStatus;
  records_processed?: number;
  error_message?: string | null;
  completed_at?: string | null;
}

export interface ProcessingRunListResponse {
  items: ProcessingRun[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}
