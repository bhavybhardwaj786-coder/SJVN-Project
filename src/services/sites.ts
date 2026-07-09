import { supabase } from '@/lib/supabase'
import type { Site } from '@/types'

export const sitesService = {
  // Get all sites (for admins) or user's assigned sites
  getSites: async () => {
    const { data, error } = await supabase
      .from('sites')
      .select('*')
      .eq('is_active', true)
      .order('name')
    return { data: data as Site[], error }
  },

  getSiteByCode: async (code: string) => {
    const { data, error } = await supabase
      .from('sites')
      .select('*')
      .eq('code', code)
      .single()
    return { data: data as Site | null, error }
  },

  // Super Admin only
  createSite: async (site: Omit<Site, 'id' | 'created_at'>) => {
    const { data, error } = await supabase
      .from('sites')
      .insert(site)
      .select()
      .single()
    return { data, error }
  }
}