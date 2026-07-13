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
      .insert(submission)
      .select()
      .single()
    return { data, error }
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
  getSubmissionForForm: async (formId: string, siteId: string, reportingMonth: string) => {
    const { data, error } = await supabase
      .from('submissions')
      .select('*')
      .eq('form_id', formId)
      .eq('site_id', siteId)
      .eq('reporting_month', reportingMonth)
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
  saveOrSubmit: async (params: {
    formId: string
    siteId: string
    userId: string
    reportingMonth: string
    data: Record<string, any>
    submit?: boolean
  }) => {
    const { formId, siteId, userId, reportingMonth, data, submit } = params
    const payload: any = {
      form_id: formId,
      site_id: siteId,
      user_id: userId,
      reporting_month: reportingMonth,
      data,
      status: submit ? 'submitted' : 'draft',
    }
    if (submit) payload.submitted_at = new Date().toISOString()

    const { data: result, error } = await supabase
      .from('submissions')
      .upsert(payload, { onConflict: 'form_id,site_id,reporting_month' })
      .select()
      .single()
    return { data: result, error }
  }
}