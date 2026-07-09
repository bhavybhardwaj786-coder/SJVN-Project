import { supabase } from '@/lib/supabase'
import type { Profile } from '@/types'

export const authService = {
  getCurrentProfile: async (): Promise<Profile | null> => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (error) console.error('Profile fetch error:', error)
    return data as Profile | null
  },

  isSuperAdmin: async (): Promise<boolean> => {
    const profile = await authService.getCurrentProfile()
    return profile?.role === 'super_admin'
  },

  isAdmin: async (): Promise<boolean> => {
    const profile = await authService.getCurrentProfile()
    return ['super_admin', 'admin'].includes(profile?.role || '')
  },

  signOut: async () => {
    return await supabase.auth.signOut()
  }
}