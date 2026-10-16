
export interface Dataset {
  id: number;
  organization_id?: number;
  name: string;
  description?: string | null;
  source_type?: string | null;
  status?: string;
  created_at?: string;
}

export interface CreateDatasetPayload {
  organization_id: number;
  name: string;
  description?: string;
  source_type?: string;
}
