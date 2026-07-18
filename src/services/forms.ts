import { apiClient } from '@/lib/apiClient'

export interface FormField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'textarea' | 'select' | 'checkbox';
  required?: boolean;
  options?: { label: string; value: string }[];
}

export interface FormSchema {
  icon: string;
  fields: FormField[];
}

export interface Form {
  id: string;
  title: string;
  description: string | null;
  schema: FormSchema;
  is_active: boolean;
  frequency: string;
  site_ids: string[] | null;
  visible_to_site_users: boolean;
  visible_to_contractors: boolean;
  created_at: string;
  updated_at: string;
}

export type CreateFormPayload = Omit<Form, 'id' | 'created_at' | 'updated_at'>;
export type UpdateFormPayload = Partial<CreateFormPayload>;

export const formsService = {

  // Admin: get ALL forms, active or not, for management
  getAllForms: async () => {
    return apiClient.get('/forms') as Promise<{ data: Form[] | null; error: string | null }>;
  },

  updateForm: async (id: string, updates: UpdateFormPayload) => {
    return apiClient.patch(`/forms/${id}`, updates) as Promise<{ data: Form | null; error: string | null }>;
  },

  deactivateForm: async (id: string) => {
    return formsService.updateForm(id, { is_active: false });
  },

  getActiveForms: async (options: { role: "site_user" | "contractor"; siteId?: string }) => {
    const params = new URLSearchParams({ role: options.role });
    if (options.siteId) params.set('siteId', options.siteId);
    return apiClient.get(`/forms/active?${params.toString()}`) as Promise<{ data: Form[] | null; error: string | null }>;
  },

  getFormById: async (id: string) => {
    return apiClient.get(`/forms/${id}`) as Promise<{ data: Form | null; error: string | null }>;
  },

  // Super Admin only
  createForm: async (formData: CreateFormPayload) => {
    return apiClient.post('/forms', formData) as Promise<{ data: Form | null; error: string | null }>;
  },

  deleteForm: async (formId: string) => {
    await apiClient.delete(`/forms/${formId}`);
    return { success: true };
  }
};