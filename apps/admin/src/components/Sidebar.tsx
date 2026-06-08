'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

const nav = [
  { href: '/', label: 'Dashboard', icon: '📊' },
  { href: '/posts', label: 'Пости', icon: '📝' },
  { href: '/constructor', label: 'Конструктор', icon: '🛠️' },
  { href: '/generate', label: 'Генерація', icon: '✨' },
  { href: '/logs', label: 'Журнал', icon: '📋' },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()

  function logout() {
    document.cookie = 'ivengo_token=; Max-Age=0; path=/'
    localStorage.removeItem('ivengo_token')
    router.push('/login')
  }

  return (
    <aside className="w-56 min-h-screen bg-slate-900 flex flex-col">
      <div className="px-5 py-6 border-b border-slate-700">
        <h1 className="text-white font-bold text-lg tracking-tight">🎰 Ivengo</h1>
        <p className="text-slate-400 text-xs mt-0.5">Авто-постинг</p>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {nav.map((item) => {
          const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? 'bg-sky-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          )
        })}
      </nav>
      <div className="px-3 py-4 border-t border-slate-700">
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
        >
          <span>🚪</span>Вийти
        </button>
      </div>
    </aside>
  )
}
