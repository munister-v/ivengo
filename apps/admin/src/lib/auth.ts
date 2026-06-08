'use client'

export function saveToken(token: string) {
  localStorage.setItem('ivengo_token', token)
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('ivengo_token')
}

export function removeToken() {
  localStorage.removeItem('ivengo_token')
}

export function isAuthenticated(): boolean {
  return !!getToken()
}
