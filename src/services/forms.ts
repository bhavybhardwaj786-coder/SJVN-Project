import { supabase } from '@/lib/supabase'

/// async function createForm(payload: {
///  title: string;
///  description: string;
///  schema: { icon: string; fields: FormField[] };
///  is_active: boolean;
///  frequency: string;
///  site_ids: string[] | null;
///}) {
///  const { data, error } = await supabase
///    .from("forms")
///    .insert({
///      title: payload.title,
///      description: payload.description,
///      schema: payload.schema,
///      is_active: payload.is_active,
///      frequency: payload.frequency,
///      site_ids: payload.site_ids,
///    })
///    .select()
///    .single();

///  return { data, error };
///}

export const formsService = {

  // Admin: get ALL forms, active or not, for management
  getAllForms: async () => {
    const { data, error } = await supabase
      .from('forms')
      .select('*')
      .order('created_at', { ascending: false })
    return { data, error }
  },

  updateForm: async (id: string, updates: any) => {
    const { data, error } = await supabase
      .from('forms')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    return { data, error }
  },

  deactivateForm: async (id: string) => {
    return formsService.updateForm(id, { is_active: false })
  },

  getActiveForms: async (options: { role: "site_user" | "contractor"; siteId?: string }) => {
    const { role, siteId } = options;
    let query = supabase
      .from('forms')
      .select('*')
      .eq('is_active', true);

    query = role === "site_user"
      ? query.eq('visible_to_site_users', true)
      : query.eq('visible_to_contractors', true);

    if (siteId) {
      // site_ids is NULL (visible to all sites) OR contains this site's id
      query = query.or(`site_ids.is.null,site_ids.cs.{${siteId}}`);
    }

    const { data, error } = await query.order('title');
    return { data, error };
  },

  getFormById: async (id: string) => {
    const { data, error } = await supabase
      .from('forms')
      .select('*')
      .eq('id', id)
      .single()
    return { data, error }
  },

  // Super Admin only
  createForm: async (formData: any) => {
    const { data, error } = await supabase
      .from('forms')
      .insert(formData)
      .select()
      .single()
    return { data, error }
  },

  deleteForm: async (formId: string) => {
    const { error } = await supabase
      .from("forms")
      .delete()
      .eq("id", formId);

    if (error) throw error;

    return { success: true };
  }
}