'use client'

// Single source of truth for the admin token.
// Stored in BOTH localStorage (read by the API client) and a cookie (read by
// the Next.js middleware) so the two never drift out of sync — that drift was
// what made the app needlessly bounce back to the login screen.

const KEY = 'ivengo_token'
const REMEMBER_KEY = 'ivengo_remember_pwd'
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

// "Запам'ятати пароль" — stores the password locally so the login form can be
// pre-filled next time. Lightly obfuscated (not encryption) just so it isn't
// sitting in plain text in devtools storage at a glance.
export function saveRememberedPassword(password: string) {
  if (typeof window === 'undefined') return
  localStorage.setItem(REMEMBER_KEY, btoa(unescape(encodeURIComponent(password))))
}

export function getRememberedPassword(): string | null {
  if (typeof window === 'undefined') return null
  const raw = localStorage.getItem(REMEMBER_KEY)
  if (!raw) return null
  try {
    return decodeURIComponent(escape(atob(raw)))
  } catch {
    return null
  }
}

export function clearRememberedPassword() {
  if (typeof window === 'undefined') return
  localStorage.removeItem(REMEMBER_KEY)
}
