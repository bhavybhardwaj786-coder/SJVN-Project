const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api'

const ACCESS_KEY = 'sjvn_access_token'
const REFRESH_KEY = 'sjvn_refresh_token'

export const tokenStorage = {
  getAccessToken: () => localStorage.getItem(ACCESS_KEY) || sessionStorage.getItem(ACCESS_KEY),
  getRefreshToken: () => localStorage.getItem(REFRESH_KEY) || sessionStorage.getItem(REFRESH_KEY),
  // persist=true (from "Keep me signed in") -> localStorage, survives browser restart.
  // persist=false -> sessionStorage, cleared when the tab/browser closes.
  setTokens: (accessToken: string, refreshToken: string, persist: boolean) => {
    const store = persist ? localStorage : sessionStorage
    const other = persist ? sessionStorage : localStorage
    store.setItem(ACCESS_KEY, accessToken)
    store.setItem(REFRESH_KEY, refreshToken)
    other.removeItem(ACCESS_KEY)
    other.removeItem(REFRESH_KEY)
  },
  setAccessToken: (accessToken: string) => {
    if (localStorage.getItem(REFRESH_KEY)) localStorage.setItem(ACCESS_KEY, accessToken)
    else sessionStorage.setItem(ACCESS_KEY, accessToken)
  },
  clear: () => {
    localStorage.removeItem(ACCESS_KEY)
    localStorage.removeItem(REFRESH_KEY)
    sessionStorage.removeItem(ACCESS_KEY)
    sessionStorage.removeItem(REFRESH_KEY)
  },
}

let refreshPromise: Promise<string | null> | null = null

async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise
  refreshPromise = (async () => {
    const refreshToken = tokenStorage.getRefreshToken()
    if (!refreshToken) return null
    try {
      const res = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      })
      if (!res.ok) return null
      const json = await res.json()
      const newAccessToken = json.data.accessToken as string
      tokenStorage.setAccessToken(newAccessToken)
      return newAccessToken
    } catch {
      return null
    } finally {
      refreshPromise = null
    }
  })()
  return refreshPromise
}

async function request(path: string, options: RequestInit = {}, isRetry = false): Promise<any> {
  const accessToken = tokenStorage.getAccessToken()
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...options.headers,
    },
  })

  // Never auto-refresh/redirect for the auth endpoints themselves — a failed
  // login attempt is not an expired session.
  const isAuthEndpoint = path.startsWith('/auth/login') || path.startsWith('/auth/refresh')

  if (res.status === 401 && !isRetry && !isAuthEndpoint) {
    const newAccessToken = await refreshAccessToken()
    if (newAccessToken) {
      return request(path, options, true)
    }
    tokenStorage.clear()
    window.location.href = '/auth'
    throw new Error('Session expired')
  }

  const json = await res.json()
  if (!res.ok) throw new Error(json.error || `Request failed: ${res.status}`)
  return json
}

export async function uploadFile(relativePath: string, file: File): Promise<{ url: string; storagePath: string }> {
  const accessToken = tokenStorage.getAccessToken()
  const formData = new FormData()
  formData.append('path', relativePath)
  formData.append('file', file)

  const res = await fetch(`${API_URL}/storage/upload`, {
    method: 'POST',
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    body: formData, // no Content-Type header — browser sets the multipart boundary itself
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error || `Upload failed: ${res.status}`)
  return json.data
}

export async function downloadFile(relativePath: string): Promise<Blob> {
  const accessToken = tokenStorage.getAccessToken()
  const res = await fetch(`${API_URL}/storage/attachments/${relativePath}`, {
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
  })
  if (!res.ok) throw new Error(`Download failed: ${res.status}`)
  return res.blob()
}

export const apiClient = {
  get: (path: string) => request(path),
  post: (path: string, body: unknown) => request(path, { method: 'POST', body: JSON.stringify(body) }),
  patch: (path: string, body: unknown) => request(path, { method: 'PATCH', body: JSON.stringify(body) }),
  put: (path: string, body: unknown) => request(path, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (path: string) => request(path, { method: 'DELETE' }),
}