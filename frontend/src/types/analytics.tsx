
export interface AnalyticsOverview {
  overall_quality_score: number;
  total_datasets: number;
  total_processing_runs: number;
  successful_processing_runs: number;
  failed_processing_runs: number;
  total_validation_failures: number;
}

export interface QualityTrend {
  period: string;
  average_quality_score: number;
  total_runs: number;
}

export interface ProcessingTrend {
  period: string;
  total_runs: number;
  successful_runs: number;
  failed_runs: number;
}

export interface FailingRule {
  rule_id: number;
  rule_name: string;
  rule_type: string;
  failure_count: number;
  failure_percentage: number;
}

export interface DatasetComparison {
  dataset_id: number;
  dataset_name: string;
  average_quality_score: number;
  total_processing_runs: number;
  total_validation_failures: number;
  successful_runs: number;
  failed_runs: number;
  success_rate: number;
  frequently_failing_rules: FailingRule[];
}

export interface DatasetComparisonResponse {
  dataset_count: number;
  start_date: string | null;
  end_date: string | null;
  items: DatasetComparison[];
}

export interface ValidationPerformance {
  rule_id: number;
  rule_name: string;
  rule_type: string;
  dataset_id: number;
  dataset_name: string;
  failure_count: number;
  total_checked: number;
  failure_percentage: number;
}

export interface AnalyticsFilters {
  dataset_id?: number;
  start_date?: string;
  end_date?: string;
  group_by?: "daily" | "weekly" | "monthly";
}

export interface DatasetComparisonFilters {
  dataset_ids: number[];
  start_date?: string;
  end_date?: string;
}

export interface ValidationPerformanceFilters extends AnalyticsFilters {
  rule_type?: string;
}

export interface AnalyticsExportFilters {
  dataset_id?: number;
  start_date?: string;
  end_date?: string;
  status?: "completed" | "failed";
}
