import { supabase } from '@/lib/supabase'
import type { Submission } from '@/types'

export const submissionsService = {

  // Get submissions for current user or their sites
  getMySubmissions: async (siteId?: string) => {
    let query = supabase
      .from('submissions')
      .select(`
        *,
        sites(name, code),
        forms(title)
      `)
      .order('reporting_month', { ascending: false })

    if (siteId) {
      query = query.eq('site_id', siteId)
    }

    const { data, error } = await query
    return { data, error }
  },

  createSubmission: async (submission: Omit<Submission, 'id' | 'created_at'>) => {
    const { data, error } = await supabase
      .from('submissions')
      .upsert(submission, {
        // Must match the DB unique constraint:
        // (reporting_month, site_id, form_id, user_id)
        onConflict: 'form_id,site_id,reporting_month,user_id',
      })

      .select()
      .single();

    return { data, error };
  },

  updateSubmission: async (id: string, updates: Partial<Submission>) => {

    const { data, error } = await supabase
      .from('submissions')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    return { data, error }
  },

  submitForApproval: async (id: string) => {
    return submissionsService.updateSubmission(id, {
      status: 'submitted',
      submitted_at: new Date().toISOString()
    })
  },

  // Check if a submission already exists for this form+site+month (for the fill-out page)
  getSubmissionForForm: async (
    formId: string,
    siteId: string,
    reportingMonth: string,
    submittedByRole: 'site' | 'contractor'
  ) => {
    const { data, error } = await supabase
      .from('submissions')

    .select('*')
    .eq('form_id', formId)
    .eq('site_id', siteId)
    .eq('reporting_month', reportingMonth)
    .eq('submitted_by_role', submittedByRole)
    .maybeSingle()
  return { data, error }
},

  // Get all submissions for a specific reporting month (used by the dashboard)
  getSubmissionsByMonth: async (reportingMonth: string, siteId?: string) => {
    let query = supabase
      .from('submissions')
      .select('*')
      .eq('reporting_month', reportingMonth)

    if (siteId) query = query.eq('site_id', siteId)

    const { data, error } = await query
    return { data, error }
  },

  // Create or update in one call — relies on the unique constraint on (form_id, site_id, reporting_month)
  // Create or update in one call — relies on the unique constraint on (form_id, site_id, reporting_month, submitted_by_role)
  saveOrSubmit: async (params: {
    formId: string
    siteId: string
    userId: string
    reportingMonth: string
    data: Record<string, any>
    submit?: boolean
    submittedByRole: 'site' | 'contractor'
  }) => {
    const { formId, siteId, userId, reportingMonth, data, submit, submittedByRole } = params
    
    const payload: any = {
      form_id: formId,
      site_id: siteId,
      user_id: userId,
      reporting_month: reportingMonth,
      data,
      status: submit ? 'submitted' : 'draft',
      // Fallback to 'site' if submittedByRole is somehow undefined or null
      submitted_by_role: submittedByRole || 'site', 
    }
    if (submit) {
      payload.submitted_at = new Date().toISOString()
    }

    console.log("Upserting Payload:", payload); // 👈 This will help us debug if it still fails

    const { data: result, error } = await supabase
      .from('submissions')
      .upsert(payload, { 
        onConflict: 'form_id,site_id,reporting_month,user_id' 
      })

      .select()
      .single()

    if (error) {
      console.error("Supabase Upsert Error Detail:", error);
    }

    return { data: result, error }
  }
}