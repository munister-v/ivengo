'use client'
import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'

export default function LoginPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { token } = await api.login(password)
      localStorage.setItem('ivengo_token', token)
      document.cookie = `ivengo_token=${token}; path=/; max-age=${7 * 24 * 3600}`
      router.push('/')
    } catch {
      setError('Невірний пароль')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-6">
            <div className="text-4xl mb-2">🎰</div>
            <h1 className="text-xl font-bold text-slate-800">Ivengo Admin</h1>
            <p className="text-sm text-slate-500 mt-1">Введіть пароль для входу</p>
          </div>
          <form onSubmit={onSubmit} className="space-y-4">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Пароль"
              required
              className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white font-medium py-3 rounded-xl text-sm transition-colors"
            >
              {loading ? 'Вхід...' : 'Увійти'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
