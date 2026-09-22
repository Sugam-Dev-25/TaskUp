
export type Notification = {
  id: number;
  activity_id: number | null;
  user_id: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  read_at: string | null;
};
export type ActivityLog = {
  id: number;

  user_id: string | null;
  user_name: string | null;

  entity_type: string;
  entity_id: string;

  action: string;

  old_data: Record<string, any> | null;
  new_data: Record<string, any> | null;
  metadata: Record<string, any> | null;

  created_at: string;
};