import { supabase } from '@/lib/supabase'

export type UserRole = 'super_admin' | 'admin' | 'site_user' | 'contractor'

export interface CurrentUser {
  id: string
  full_name: string
  role: UserRole
  site_id?: string        // present for site_users and contractors
  designation?: string    // present for site_users and contractors
}

export const authService = {
  getCurrentUser: async (): Promise<CurrentUser | null> => {
    // 1. Fetch the active credential token session from Supabase Auth
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    // 2. Safely check if the user is a Super Admin
    const { data: superAdmin } = await supabase
      .from('super_admins')
      .select('id, full_name')
      .eq('id', user.id)
      .maybeSingle()
    if (superAdmin) return { ...superAdmin, role: 'super_admin' }

    // 3. Safely check if the user is a standard Admin
    const { data: admin } = await supabase
      .from('admins')
      .select('id, full_name')
      .eq('id', user.id)
      .maybeSingle()
    if (admin) return { ...admin, role: 'admin' }

    // 4. Safely check if the user is an operational Site User
    const { data: siteUser } = await supabase
      .from('site_users')
      .select('id, full_name, site_id, designation')
      .eq('id', user.id)
      .maybeSingle()
    if (siteUser) return { ...siteUser, role: 'site_user' }

    // 5. Safely check if the user is a Contractor
    const { data: contractor } = await supabase
      .from('contractors')
      .select('id, full_name, site_id, designation')
      .eq('id', user.id)
      .maybeSingle()
    if (contractor) return { ...contractor, role: 'contractor' }

    // 6. Fallback return value if profile has not populated yet
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