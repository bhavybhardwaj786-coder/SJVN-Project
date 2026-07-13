import { supabase } from '@/lib/supabase'

export type UserRole = 'super_admin' | 'admin' | 'site_user'

export interface CurrentUser {
  id: string
  full_name: string
  role: UserRole
  site_id?: string        // only present for site_users
  designation?: string    // only present for site_users
}

export const authService = {
  getCurrentUser: async (): Promise<CurrentUser | null> => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data: superAdmin } = await supabase
      .from('super_admins')
      .select('id, full_name')
      .eq('id', user.id)
      .single()
    if (superAdmin) return { ...superAdmin, role: 'super_admin' }

    const { data: admin } = await supabase
      .from('admins')
      .select('id, full_name')
      .eq('id', user.id)
      .single()
    if (admin) return { ...admin, role: 'admin' }

    const { data: siteUser } = await supabase
      .from('site_users')
      .select('id, full_name, site_id, designation')
      .eq('id', user.id)
      .single()
    if (siteUser) return { ...siteUser, role: 'site_user' }

    return null
  },

  isSuperAdmin: async (): Promise<boolean> => {
    const user = await authService.getCurrentUser()
    return user?.role === 'super_admin'
  },

  isAdmin: async (): Promise<boolean> => {
    const user = await authService.getCurrentUser()
    return user?.role === 'admin' || user?.role === 'super_admin'
  },

  signOut: async () => {
    return await supabase.auth.signOut()
  }
}