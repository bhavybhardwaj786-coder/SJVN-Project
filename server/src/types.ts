export interface Site {
  id: string
  name: string
  code: string
  location: string | null
  description: string | null
  is_active: boolean
  unlocked_months: string[]
  created_at: string
  updated_at: string
}

export interface ApiResponse<T> {
  data: T | null
  error: string | null
}

export interface FormField {
  key: string
  label: string
  type: 'text' | 'number' | 'date' | 'textarea' | 'select' | 'checkbox'
  required?: boolean
  options?: { label: string; value: string }[]
}

export interface FormSchema {
  icon: string
  fields: FormField[]
}

export interface Submission {
  id: string
  form_id: string
  site_id: string
  user_id: string | null
  reporting_month: string
  data: Record<string, any>
  status: 'draft' | 'submitted' | 'approved' | 'rejected'
  submitted_by_role: 'site' | 'contractor'
  submitted_at: string | null
  approved_by: string | null
  approved_at: string | null
  edit_unlocked: boolean
  edit_unlocked_by: string | null
  edit_unlocked_at: string | null
  created_at: string
  updated_at: string
}

export interface Form {
  id: string
  title: string
  description: string | null
  schema: FormSchema
  is_active: boolean
  frequency: string
  site_ids: string[] | null
  visible_to_site_users: boolean
  visible_to_contractors: boolean
  created_at: string
  updated_at: string
}