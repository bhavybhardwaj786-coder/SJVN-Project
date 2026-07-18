import { apiClient } from '@/lib/apiClient'
import type { Submission } from '@/types'

export const submissionsService = {

  // Get submissions for current user or their sites
  getMySubmissions: async (siteId?: string) => {
    const params = new URLSearchParams()
    if (siteId) params.set('siteId', siteId)
    const qs = params.toString()
    return apiClient.get(`/submissions${qs ? `?${qs}` : ''}`) as Promise<{ data: any[] | null; error: string | null }>
  },

  createSubmission: async (submission: Omit<Submission, 'id' | 'created_at'>) => {
    return apiClient.post('/submissions', submission) as Promise<{ data: Submission | null; error: string | null }>
  },

  updateSubmission: async (id: string, updates: Partial<Submission>) => {
    return apiClient.put(`/submissions/${id}`, updates) as Promise<{ data: Submission | null; error: string | null }>
  },

  submitForApproval: async (id: string) => {
    return submissionsService.updateSubmission(id, {
      status: 'submitted',
      submitted_at: new Date().toISOString()
    })
  },

  // User-scoped existing-submission lookup (used by contractor_forms__formId.tsx,
  // which filters by the specific user rather than by role)
  getSubmissionForUser: async (formId: string, siteId: string, reportingMonth: string, userId: string) => {
    const params = new URLSearchParams({ formId, siteId, reportingMonth, userId })
    return apiClient.get(`/submissions/lookup?${params.toString()}`) as Promise<{ data: Submission | null; error: string | null }>
  },

  // Check if a submission already exists for this form+site+month (for the fill-out page)
  getSubmissionForForm: async (
    formId: string,
    siteId: string,
    reportingMonth: string,
    submittedByRole: 'site' | 'contractor'
  ) => {
    const params = new URLSearchParams({ formId, siteId, reportingMonth, submittedByRole })
    return apiClient.get(`/submissions/lookup?${params.toString()}`) as Promise<{ data: Submission | null; error: string | null }>
  },

  // Get all submissions for a specific reporting month (used by the dashboard)
  getSubmissionsByMonth: async (reportingMonth: string, siteId?: string, userId?: string) => {
    const params = new URLSearchParams({ reportingMonth })
    if (siteId) params.set('siteId', siteId)
    if (userId) params.set('userId', userId)
    return apiClient.get(`/submissions/by-month?${params.toString()}`) as Promise<{ data: Submission[] | null; error: string | null }>
  },

  // Single submission with joined form+site (replaces the duplicate loader/component queries in _submissionId.tsx)
  getSubmissionById: async (id: string) => {
    return apiClient.get(`/submissions/${id}`) as Promise<{ data: any | null; error: string | null }>
  },

  // Admin view: submissions for a month, optionally filtered by status, joined with form+site
  getAdminSubmissionsByMonth: async (reportingMonth: string, status?: string) => {
    const params = new URLSearchParams({ reportingMonth })
    if (status) params.set('status', status)
    return apiClient.get(`/submissions/admin?${params.toString()}`) as Promise<{ data: any[] | null; error: string | null }>
  },

  // Create or update in one call — relies on the unique constraint (form_id, site_id, reporting_month, user_id)
  saveOrSubmit: async (params: {
    formId: string
    siteId: string
    userId: string
    reportingMonth: string
    data: Record<string, any>
    submit?: boolean
    submittedByRole: 'site' | 'contractor'
  }) => {
    return apiClient.post('/submissions/save-or-submit', params) as Promise<{ data: Submission | null; error: string | null }>
  }
}