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
  }
}