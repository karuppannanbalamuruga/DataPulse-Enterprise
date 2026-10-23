
export interface Dataset {
  id: number;
  organization_id: number;
  name: string;
  description: string | null;
  source_type: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface CreateDatasetPayload {
  organization_id: number;
  name: string;
  description?: string;
  source_type?: string;
}

export interface UpdateDatasetPayload {
  organization_id?: number;
  name?: string;
  description?: string | null;
  source_type?: string;
  status?: string;
}

export interface DatasetListResponse {
  items: Dataset[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface DatasetQueryParams {
  search?: string;
  status?: string;
  source_type?: string;
  page?: number;
  page_size?: number;
}
