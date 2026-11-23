
export interface Alert {
  id: number;
  alert_rule_id: number;
  dataset_id: number;
  processing_run_id: number | null;
  title: string;
  description: string;
  severity: string;
  observed_value: Record<string, unknown>;
  configured_threshold: Record<string, unknown>;
  status: string;
  triggered_at: string;
  acknowledged_at: string | null;
  resolved_at: string | null;
}

export interface AlertListResponse {
  items: Alert[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface AlertQueryParams {
  page?: number;
  page_size?: number;
  status?: string;
  severity?: string;
  dataset_id?: number;
}

export interface AlertActionResponse {
  message: string;
  alert_id: number;
  status: string;
  acknowledged_at?: string | null;
  resolved_at?: string | null;
}

export interface Notification {
  id: number;
  alert_id: number;
  recipient_user_id: number;
  notification_type: string;
  is_read: boolean;
  delivery_status: string;
  created_at: string;
  read_at: string | null;
}

export interface NotificationListResponse {
  items: Notification[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  unread_count: number;
}

export interface NotificationQueryParams {
  recipient_user_id: number;
  page?: number;
  page_size?: number;
  is_read?: boolean;
  notification_type?: string;
}

export interface UnreadNotificationCount {
  recipient_user_id: number;
  unread_count: number;
}

export interface MarkNotificationReadResponse {
  message: string;
  notification_id: number;
  is_read: boolean;
  read_at: string | null;
}

export interface MarkAllNotificationsReadResponse {
  message: string;
  recipient_user_id: number;
  updated_count: number;
}
