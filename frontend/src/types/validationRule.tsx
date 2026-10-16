
export interface ValidationRule {
  id: number;
  dataset_id: number;
  name: string;
  rule_type: string;
  description?: string | null;
  is_active: boolean;
  created_at?: string;
}

export interface CreateValidationRulePayload {
  dataset_id: number;
  name: string;
  rule_type: string;
  description?: string;
  is_active?: boolean;
}
