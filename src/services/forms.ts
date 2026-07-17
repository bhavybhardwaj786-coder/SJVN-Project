import { supabase } from '@/lib/supabase'

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

// Strictly type the payload used for creation and updates
export type CreateFormPayload = Omit<Form, 'id' | 'created_at' | 'updated_at'>;
export type UpdateFormPayload = Partial<CreateFormPayload>;

export const formsService = {

  // Admin: get ALL forms, active or not, for management
  getAllForms: async () => {
    const { data, error } = await supabase
      .from('forms')
      .select('*')
      .order('created_at', { ascending: false });
    
    return { data: data as Form[] | null, error };
  },

  // Strongly typed update function
  updateForm: async (id: string, updates: UpdateFormPayload) => {
    const { data, error } = await supabase
      .from('forms')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    return { data: data as Form | null, error };
  },

  deactivateForm: async (id: string) => {
    return formsService.updateForm(id, { is_active: false });
  },

  getActiveForms: async (options: { role: "site_user" | "contractor"; siteId?: string }) => {
    const { role, siteId } = options;
    let query = supabase
      .from('forms')
      .select('*')
      .eq('is_active', true);

    // Filter by target role visibility flags
    query = role === "site_user"
      ? query.eq('visible_to_site_users', true)
      : query.eq('visible_to_contractors', true);

    if (siteId) {
      // safe fallbacks for the array containment array string
      query = query.or(`site_ids.is.null,site_ids.cs.{${siteId}}`);
    }

    const { data, error } = await query.order('title');
    return { data: data as Form[] | null, error };
  },

  getFormById: async (id: string) => {
    const { data, error } = await supabase
      .from('forms')
      .select('*')
      .eq('id', id)
      .single();
    
    return { data: data as Form | null, error };
  },

  // Super Admin only: strongly typed payload
  createForm: async (formData: CreateFormPayload) => {
    const { data, error } = await supabase
      .from('forms')
      .insert(formData)
      .select()
      .single();
    
    return { data: data as Form | null, error };
  },

  deleteForm: async (formId: string) => {
    const { error } = await supabase
      .from("forms")
      .delete()
      .eq("id", formId);

    if (error) throw error;

    return { success: true };
  }
};