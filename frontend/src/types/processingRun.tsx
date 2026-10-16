
export interface ProcessingRun {
  id: number;
  dataset_id: number;
  status: string;
  records_processed: number;
  error_message?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
}
