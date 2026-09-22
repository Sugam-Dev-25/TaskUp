export type User = {
  id: string;
  email: string;
  full_name: string;
  role: "employee" | "hr" | "manager" | "ceo";
  is_active: boolean;
  is_verified: boolean;
  is_superuser: boolean;
  failed_login_attempts: number;
  locked_until: string | null;
  last_login_at: string | null;
  is_approved: boolean;
  approved_by: string | null;
  approved_at: string | null;
  rejected_reason: string | null;
  created_at: string;
  updated_at: string;
};

export type ApprovalRequest = {
  id: string;
  user_id: string;
  status: "pending" | "approved" | "rejected";
  requested_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  reject_reason: string | null;
};


export type Profile = {
  id: string;
  user_id: string;
  location: string | null;
  experience: number | null;
  description: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  profile_image: string | null;
  rating: number;
  status: "under_review" | "approved" | "rejected";
  created_at: string;
  updated_at: string;
};