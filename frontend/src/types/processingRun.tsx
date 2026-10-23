
export type ProcessingRunStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed";

export interface ProcessingRun {
  id: number;
  dataset_id: number;
  status: ProcessingRunStatus;
  records_processed: number;
  error_message?: string | null;
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
  dataset_id?: number;
  status?: ProcessingRunStatus;
}

export interface UpdateProcessingRunPayload {
  status?: ProcessingRunStatus;
  records_processed?: number;
  error_message?: string | null;
  completed_at?: string | null;
}
