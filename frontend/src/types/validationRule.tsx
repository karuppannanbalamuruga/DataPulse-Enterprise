export interface ValidationRule {
  id: number;
  dataset_id: number;
  name: string;
  rule_type: string;
  description: string | null;
  configuration: Record<string, unknown>;
  is_active: boolean;
  created_at?: string;
}

export interface CreateValidationRulePayload {
  dataset_id: number;
  name: string;
  rule_type: string;
  description?: string | null;
  configuration: Record<string, unknown>;
  is_active?: boolean;
}

export interface UpdateValidationRulePayload {
  dataset_id?: number;
  name?: string;
  rule_type?: string;
  description?: string | null;
  configuration?: Record<string, unknown>;
  is_active?: boolean;
}

export interface ValidationRulesResponse {
  items: ValidationRule[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface ValidationRuleQueryParams {
  page?: number;
  page_size?: number;
  search?: string;
  dataset_id?: number;
}
