'use client'
import { useState, FormEvent, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { saveToken, saveRememberedPassword, getRememberedPassword, clearRememberedPassword } from '@/lib/auth'

export default function LoginPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Pre-fill from a previously "remembered" password, if any.
  useEffect(() => {
    const saved = getRememberedPassword()
    if (saved) {
      setPassword(saved)
      setRemember(true)
    }
  }, [])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    // Trim accidental whitespace/newlines from copy-paste — a common cause
    // of "Невірний пароль" when the password was copied with a trailing space.
    const pwd = password.trim()
    try {
      const { token } = await api.login(pwd)
      saveToken(token)
      if (remember) {
        saveRememberedPassword(pwd)
      } else {
        clearRememberedPassword()
      }
      // First-run UX: if no channels are configured yet, land on the setup page
      // (publishing can't work without one), otherwise go to the dashboard.
      let dest = '/'
      try {
        const channels = await api.getChannels()
        if (channels.length === 0) dest = '/channels'
      } catch {
        // ignore — fall back to dashboard
      }
      router.push(dest)
      router.refresh()
    } catch {
      setError('Невірний пароль')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-tile-amber text-tile-coal lg:grid lg:grid-cols-[1.35fr_0.65fr]">
      <section className="flex min-h-[48vh] flex-col border-b border-tile-coal lg:min-h-screen lg:border-b-0 lg:border-r">
        <header className="flex min-h-16 items-center justify-between border-b border-tile-coal px-5 lg:px-8">
          <div className="flex items-center gap-3">
            <span className="flex h-4 w-4 items-center justify-center rounded-full border border-tile-coal">
              <span className="h-1.5 w-1.5 rounded-full bg-tile-coal" />
            </span>
            <span className="font-mono text-xs uppercase tracking-[0.24em]">Ivengo Studio</span>
          </div>
          <span className="font-mono text-[9px] uppercase tracking-[0.18em] opacity-55">Private archive</span>
        </header>
        <div className="flex flex-1 flex-col justify-between gap-12 p-6 sm:p-10 lg:p-16">
          <div className="grid grid-cols-3 font-mono text-[9px] uppercase tracking-[0.18em] text-tile-coal/45">
            <span>Design</span>
            <span className="text-center">Publish</span>
            <span className="text-right">Measure</span>
          </div>
          <div>
            <h1 className="text-[clamp(4.5rem,13vw,12rem)] font-normal leading-[0.74] tracking-[-0.06em]">
              IVENGO
            </h1>
            <div className="mt-5 flex items-end justify-between gap-6">
              <p className="font-mono text-xs uppercase tracking-[0.3em]">studio.</p>
              <p className="max-w-md text-right text-lg italic leading-relaxed text-tile-coal/65">
                Редакційний простір для контенту, каналів та аналітики.
              </p>
            </div>
          </div>
          <p className="max-w-xl text-xl italic leading-relaxed text-tile-coal/55">
            “A living archive for every idea, publication and result.”
          </p>
        </div>
      </section>

      <section className="flex min-h-[52vh] items-center justify-center bg-[#fffdf9] p-6 sm:p-10 lg:min-h-screen">
        <div className="w-full max-w-sm">
          <p className="eyebrow mb-4">Access · 01</p>
          <h2 className="text-4xl font-normal">Вхід до студії</h2>
          <p className="mt-3 text-base italic text-tile-coal/55">Введіть пароль редактора, щоб продовжити.</p>
          <form onSubmit={onSubmit} className="mt-10 space-y-6">
            <div>
              <label htmlFor="password" className="lbl">Пароль</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                autoComplete="current-password"
                className="fld !py-3"
              />
            </div>
            <label className="flex min-h-11 cursor-pointer items-center gap-3 font-mono text-[10px] uppercase tracking-[0.14em] text-tile-coal/60">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="h-4 w-4 accent-tile-coal"
              />
              Запам&apos;ятати на цьому пристрої
            </label>
            {error && <p role="alert" className="border border-tile-rose bg-tile-rose/10 px-3 py-2 text-sm text-tile-rose">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="btn min-h-12 w-full"
            >
              {loading ? 'Перевірка…' : 'Увійти до Ivengo →'}
            </button>
          </form>
          <p className="mt-10 border-t border-tile-coal/20 pt-4 font-mono text-[9px] uppercase leading-relaxed tracking-[0.14em] text-tile-coal/40">
            Ivengo editorial system · Secure access
          </p>
        </div>
      </section>
    </main>
  )
}
