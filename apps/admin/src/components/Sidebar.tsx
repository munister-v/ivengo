'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { removeToken } from '@/lib/auth'

const nav = [
  { href: '/', label: 'Dashboard', icon: '◆' },
  { href: '/calendar', label: 'Календар', icon: '▦' },
  { href: '/posts', label: 'Пости', icon: '✎' },
  { href: '/constructor', label: 'Конструктор', icon: '⚒' },
  { href: '/generate', label: 'Генерація', icon: '✦' },
  { href: '/ab', label: 'A/B Тести', icon: '⚗' },
  { href: '/media', label: 'Медіа', icon: '▣' },
  { href: '/channels', label: 'Канали', icon: '⛓' },
  { href: '/emoji', label: 'Преміум емодзі', icon: '★' },
  { href: '/analytics', label: 'Аналітика', icon: '▤' },
  { href: '/logs', label: 'Журнал', icon: '☰' },
  { href: '/monitoring', label: 'Моніторинг', icon: '✚' },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)

  function logout() {
    removeToken()
    router.push('/login')
    router.refresh()
  }

  const content = (
    <>
      <div className="px-5 py-6 flex items-center justify-between">
        <div>
          <h1 className="text-white font-bold text-lg tracking-tight">🎰 Ivengo</h1>
          <p className="text-tile-pink text-[10px] font-mono uppercase tracking-[0.2em] mt-1">Авто-постинг</p>
        </div>
        <button
          onClick={() => setOpen(false)}
          className="lg:hidden text-white/50 hover:text-white text-xl leading-none"
          aria-label="Закрити меню"
        >
          ✕
        </button>
      </div>
      <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
        {nav.map((item) => {
          const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={`group flex items-center gap-3 px-3 py-2 text-xs font-mono uppercase tracking-wider transition-colors ${
                active
                  ? 'bg-tile-pink text-tile-coal font-bold'
                  : 'text-white/55 hover:bg-white/5 hover:text-white'
              }`}
            >
              <span className={`text-sm leading-none ${active ? 'text-tile-coal' : 'text-tile-pink/70 group-hover:text-tile-pink'}`}>{item.icon}</span>
              {item.label}
            </Link>
          )
        })}
      </nav>
      <div className="px-3 py-4">
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2 text-xs font-mono uppercase tracking-wider text-white/40 hover:bg-tile-rose hover:text-white transition-colors"
        >
          <span className="text-sm leading-none">⏻</span>Вийти
        </button>
      </div>
    </>
  )

  return (
    <>
      {/* Mobile top bar */}
      <div className="lg:hidden sticky top-0 z-30 flex items-center justify-between bg-tile-coal px-4 py-3">
        <h1 className="text-white font-bold text-base tracking-tight">🎰 Ivengo</h1>
        <button
          onClick={() => setOpen(true)}
          className="text-white text-xl leading-none px-2 py-1"
          aria-label="Відкрити меню"
        >
          ☰
        </button>
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-56 min-h-screen bg-tile-coal flex-col flex-shrink-0">
        {content}
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <aside className="relative w-64 max-w-[80vw] min-h-screen bg-tile-coal flex flex-col z-50">
            {content}
          </aside>
        </div>
      )}
    </>
  )
}
