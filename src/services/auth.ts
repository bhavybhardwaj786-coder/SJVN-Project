import { apiClient, tokenStorage } from '@/lib/apiClient'

export type UserRole = 'super_admin' | 'admin' | 'site_user' | 'contractor'

export interface CurrentUser {
  id: string
  full_name: string
  email: string
  role: UserRole
  site_id?: string        // present for site_users and contractors
  designation?: string    // present for site_users and contractors
}

export const authService = {
  login: async (email: string, password: string, keepSignedIn: boolean): Promise<CurrentUser> => {
    const result = await apiClient.post('/auth/login', { email, password }) as {
      data: { accessToken: string; refreshToken: string; user: CurrentUser } | null
      error: string | null
    }
    if (result.error || !result.data) throw new Error(result.error || 'Login failed')
    tokenStorage.setTokens(result.data.accessToken, result.data.refreshToken, keepSignedIn)
    return result.data.user
  },

  getCurrentUser: async (): Promise<CurrentUser | null> => {
    if (!tokenStorage.getAccessToken()) return null
    try {
      const result = await apiClient.get('/auth/me') as { data: CurrentUser | null; error: string | null }
      return result.data
    } catch {
      return null
    }
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
    tokenStorage.clear()
  }
}