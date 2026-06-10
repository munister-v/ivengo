'use client'
import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { saveToken } from '@/lib/auth'

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
      saveToken(token)
      router.push('/')
      router.refresh()
    } catch {
      setError('Невірний пароль')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-3">
      <div className="lg:col-span-2 bg-tile-blue flex flex-col justify-center p-10 lg:p-20 text-white">
        <span className="text-xs font-mono uppercase tracking-widest opacity-70 mb-3">Ivengo · Admin</span>
        <h1 className="text-4xl lg:text-6xl font-bold leading-tight mb-4">🎰 Ivengo<br/>Admin</h1>
        <p className="text-lg opacity-80 max-w-md">Авто-постинг у Telegram-канал — пости, аналітика, A/B тести, медіа та модерація в одному місці.</p>
      </div>
      <div className="bg-tile-coal flex items-center justify-center p-10">
        <div className="w-full max-w-sm">
          <h2 className="text-white text-xl font-bold mb-1">Вхід</h2>
          <p className="text-white/40 text-sm mb-6">Введіть пароль для входу</p>
          <form onSubmit={onSubmit} className="space-y-4">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Пароль"
              required
              className="w-full px-4 py-3 bg-white/5 border border-white/10 text-white placeholder:text-white/30 text-sm focus:outline-none focus:border-tile-pink"
            />
            {error && <p className="text-sm text-tile-pink">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-tile-pink hover:bg-tile-teal disabled:opacity-50 text-tile-coal font-bold py-3 text-sm transition-colors"
            >
              {loading ? 'Вхід...' : 'Увійти'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
