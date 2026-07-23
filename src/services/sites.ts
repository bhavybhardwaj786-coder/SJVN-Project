import { apiClient } from '@/lib/apiClient'
import type { Site } from '@/types'

export const sitesService = {
  // Get all sites (for admins) or user's assigned sites
  getSites: async () => {
    return apiClient.get('/sites') as Promise<{ data: Site[]; error: string | null }>
  },

  getSiteByCode: async (code: string) => {
    return apiClient.get(`/sites/code/${code}`) as Promise<{ data: Site | null; error: string | null }>
  },

  // Super Admin only
  createSite: async (site: Omit<Site, 'id' | 'created_at'>) => {
    return apiClient.post('/sites', site) as Promise<{ data: Site; error: string | null }>
  },

  getSiteAccess: async (siteId: string) => {
    return apiClient.get(`/sites/${siteId}/access`) as Promise<{
      data: { unlocked_months: string[] } | null
      error: string | null
    }>
  },

  getAllSitesAdmin: async () => {
    return apiClient.get('/sites/all') as Promise<{ data: Site[] | null; error: string | null }>
  },

  updateSite: async (id: string, updates: Partial<Site>) => {
    return apiClient.patch(`/sites/${id}`, updates) as Promise<{ data: Site[] | null; error: string | null }>
  },

  deleteSite: async (id: string) => {
  return apiClient.delete(`/sites/${id}`) as Promise<{ data: any; error: string | null }>
  },
}
