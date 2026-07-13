export type UserRole = 'super_admin' | 'admin' | 'site_user';
// Export all services
export interface Site {
  id: string;
  name: string;
  code: string;
  location?: string;
  description?: string;
  is_active: boolean;
  created_at: string;
}

export interface Form {
  id: string;
  title: string;
  description?: string;
  version: number;
  is_active: boolean;
  schema: any;
  created_by: string;
  created_at: string;
}

export interface Submission {
  id: string;
  form_id: string;
  site_id: string;
  user_id?: string;
  reporting_month: string;
  data: any;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  submitted_at?: string;
  approved_by?: string;
  approved_at?: string;
}

export interface Profile {
  id: string;
  full_name?: string;
  role: UserRole;
  is_active: boolean;
}