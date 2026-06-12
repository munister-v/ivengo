'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { removeToken } from '@/lib/auth'
import { api, type StatsData } from '@/lib/api'

const nav = [
  { href: '/', label: 'Overview', index: '01' },
  { href: '/constructor', label: 'Studio', index: '02' },
  { href: '/generate', label: 'Generate', index: '03' },
  { href: '/calendar', label: 'Calendar', index: '04' },
  { href: '/posts', label: 'Posts', index: '05' },
  { href: '/ab', label: 'A/B', index: '06' },
  { href: '/media', label: 'Media', index: '07' },
  { href: '/channels', label: 'Channels', index: '08' },
  { href: '/emoji', label: 'Emoji', index: '09' },
  { href: '/analytics', label: 'Analytics', index: '10' },
  { href: '/logs', label: 'Journal', index: '11' },
  { href: '/monitoring', label: 'System', index: '12' },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [stats, setStats] = useState<StatsData | null>(null)

  useEffect(() => {
    let active = true
    const loadStats = () => api.getStats().then((value) => {
      if (active) setStats(value)
    }).catch(() => {})
    loadStats()
    const interval = setInterval(loadStats, 60000)
    return () => {
      active = false
      clearInterval(interval)
    }
  }, [pathname])

  function badgeFor(href: string): number {
    if (href === '/posts') return stats?.byStatus.pending_review ?? 0
    if (href === '/monitoring') return stats?.failedToday ?? 0
    return 0
  }

  function logout() {
    removeToken()
    router.push('/login')
    router.refresh()
  }

  return (
    <>
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:bg-tile-coal focus:px-4 focus:py-3 focus:text-white">
        До основного вмісту
      </a>
      <header className="sticky top-0 z-30 border-b border-tile-coal bg-tile-amber/95 backdrop-blur-sm">
        <div className="flex min-h-16 items-stretch">
          <Link href="/" className="flex min-w-[220px] items-center gap-3 border-r border-tile-coal px-4 lg:px-6" aria-label="Ivengo — головна">
            <span className="flex h-4 w-4 items-center justify-center rounded-full border border-tile-coal">
              <span className="h-1.5 w-1.5 rounded-full bg-tile-coal" />
            </span>
            <span className="font-mono text-xs uppercase tracking-[0.24em]">Ivengo Studio</span>
          </Link>

          <nav className="hidden min-w-0 flex-1 overflow-x-auto lg:flex" aria-label="Головна навігація">
            {nav.map((item) => {
              const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
              const badge = badgeFor(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`group flex min-w-[92px] flex-1 flex-col justify-center border-r border-tile-coal px-3 py-2 font-mono uppercase ${
                    active ? 'bg-tile-coal text-tile-amber' : 'text-tile-coal hover:bg-tile-coal hover:text-tile-amber'
                  }`}
                >
                  <span className="text-[8px] tracking-[0.18em] opacity-50">{item.index}</span>
                  <span className="mt-1 flex items-center justify-between gap-2 text-[10px] tracking-[0.13em]">
                    {item.label}
                    {badge > 0 && (
                      <span className={`flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[8px] ${
                        active ? 'bg-tile-amber text-tile-coal' : 'bg-tile-coal text-tile-amber group-hover:bg-tile-amber group-hover:text-tile-coal'
                      }`}>
                        {badge > 99 ? '99+' : badge}
                      </span>
                    )}
                  </span>
                </Link>
              )
            })}
          </nav>

          <button
            onClick={logout}
            className="hidden min-w-[82px] items-center justify-center border-l border-tile-coal px-4 font-mono text-[10px] uppercase tracking-[0.16em] hover:bg-tile-coal hover:text-tile-amber xl:flex"
          >
            Exit
          </button>

          <button
            onClick={() => setOpen(true)}
            className="ml-auto flex min-h-16 min-w-16 items-center justify-center border-l border-tile-coal font-mono text-xs uppercase tracking-widest lg:hidden"
            aria-label="Відкрити меню"
            aria-expanded={open}
          >
            Menu
          </button>
        </div>
      </header>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button className="absolute inset-0 bg-tile-coal/45" onClick={() => setOpen(false)} aria-label="Закрити меню" />
          <aside className="absolute right-0 top-0 flex h-full w-[min(88vw,420px)] flex-col border-l border-tile-coal bg-tile-amber">
            <div className="flex min-h-16 items-center justify-between border-b border-tile-coal px-5">
              <span className="font-mono text-xs uppercase tracking-[0.22em]">Index</span>
              <button
                onClick={() => setOpen(false)}
                className="min-h-11 px-2 font-mono text-xs uppercase tracking-widest"
                aria-label="Закрити меню"
              >
                Close
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto" aria-label="Мобільна навігація">
              {nav.map((item) => {
                const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
                const badge = badgeFor(item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={`flex min-h-14 items-center justify-between border-b border-tile-coal/35 px-5 font-mono uppercase ${
                      active ? 'bg-tile-coal text-tile-amber' : 'text-tile-coal'
                    }`}
                  >
                    <span className="flex items-center gap-2 text-xs tracking-[0.16em]">
                      {item.label}
                      {badge > 0 && <span className="rounded-full border border-current px-1.5 py-0.5 text-[8px]">{badge > 99 ? '99+' : badge}</span>}
                    </span>
                    <span className="text-[9px] tracking-widest opacity-55">{item.index}</span>
                  </Link>
                )
              })}
            </nav>
            <button
              onClick={logout}
              className="min-h-16 border-t border-tile-coal px-5 text-left font-mono text-xs uppercase tracking-[0.16em] hover:bg-tile-coal hover:text-tile-amber"
            >
              Exit session
            </button>
          </aside>
        </div>
      )}
    </>
  )
}
