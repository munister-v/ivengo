'use client'

// Single source of truth for the admin token.
// Stored in BOTH localStorage (read by the API client) and a cookie (read by
// the Next.js middleware) so the two never drift out of sync — that drift was
// what made the app needlessly bounce back to the login screen.

const KEY = 'ivengo_token'
const MAX_AGE = 7 * 24 * 3600

export function saveToken(token: string) {
  if (typeof window === 'undefined') return
  localStorage.setItem(KEY, token)
  document.cookie = `${KEY}=${token}; path=/; max-age=${MAX_AGE}; SameSite=Lax`
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(KEY)
}

export function removeToken() {
  if (typeof window === 'undefined') return
  localStorage.removeItem(KEY)
  document.cookie = `${KEY}=; path=/; max-age=0; SameSite=Lax`
}

export function isAuthenticated(): boolean {
  return !!getToken()
}

// Full client-side path including basePath (e.g. /ivengo/login).
export function loginPath(): string {
  const base = process.env.NEXT_PUBLIC_BASE_PATH || ''
  return `${base}/login`
}
