
export interface Organization {
  id: number;
  name: string;
  slug: string;
}

export interface OrganizationListResponse {
  items: Organization[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface OrganizationQueryParams {
  page?: number;
  page_size?: number;
  search?: string;
}

export interface CreateOrganizationPayload {
  name: string;
  slug: string;
}

export interface UpdateOrganizationPayload {
  name?: string;
  slug?: string;
}
