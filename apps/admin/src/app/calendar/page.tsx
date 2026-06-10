'use client'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { api, type CalendarPost } from '@/lib/api'

const STATUS_COLOR: Record<string, string> = {
  scheduled: 'bg-tile-blue text-white',
  published: 'bg-tile-teal text-tile-coal',
  pending_review: 'bg-tile-pink text-tile-coal',
  failed: 'bg-tile-rose text-white',
  rejected: 'bg-white/10 text-white/60',
}

const MONTH_NAMES = [
  'Січень', 'Лютий', 'Березень', 'Квітень', 'Травень', 'Червень',
  'Липень', 'Серпень', 'Вересень', 'Жовтень', 'Листопад', 'Грудень',
]
const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд']

export default function CalendarPage() {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [posts, setPosts] = useState<CalendarPost[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDay, setSelectedDay] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    const from = new Date(year, month, 1)
    const to = new Date(year, month + 1, 0, 23, 59, 59)
    api.getCalendar(from.toISOString(), to.toISOString())
      .then((res) => setPosts(res.posts))
      .finally(() => setLoading(false))
  }, [year, month])

  const postsByDay = useMemo(() => {
    const map: Record<string, CalendarPost[]> = {}
    for (const p of posts) {
      const dateStr = p.publishedAt || p.scheduledAt
      if (!dateStr) continue
      const key = new Date(dateStr).toDateString()
      if (!map[key]) map[key] = []
      map[key].push(p)
    }
    return map
  }, [posts])

  const days = useMemo(() => {
    const firstOfMonth = new Date(year, month, 1)
    const offset = (firstOfMonth.getDay() + 6) % 7
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const cells: (Date | null)[] = []
    for (let i = 0; i < offset; i++) cells.push(null)
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d))
    return cells
  }, [year, month])

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear((y) => y - 1) } else setMonth((m) => m - 1)
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear((y) => y + 1) } else setMonth((m) => m + 1)
  }

  const selectedPosts = selectedDay ? postsByDay[selectedDay] ?? [] : []

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="page-title">📅 Календар публікацій</h1>
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="btn-coal">←</button>
          <span className="text-sm font-mono uppercase tracking-wider text-tile-coal w-36 text-center">{MONTH_NAMES[month]} {year}</span>
          <button onClick={nextMonth} className="btn-coal">→</button>
        </div>
      </div>

      {loading ? (
        <div className="eyebrow animate-pulse">Завантаження…</div>
      ) : (
        <div className="panel-pad !p-2 sm:!p-4">
          <div className="grid grid-cols-7 gap-1 mb-1">
            {WEEKDAYS.map((d) => (
              <div key={d} className="text-center text-[10px] font-mono uppercase tracking-widest text-white/40 py-1">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {days.map((d, i) => {
              if (!d) return <div key={i} />
              const key = d.toDateString()
              const dayPosts = postsByDay[key] ?? []
              const isToday = key === today.toDateString()
              return (
                <button
                  key={i}
                  onClick={() => setSelectedDay(dayPosts.length ? key : null)}
                  className={`aspect-square sm:aspect-auto sm:h-20 p-1 text-left flex flex-col gap-0.5 overflow-hidden transition-colors ${
                    isToday ? 'bg-tile-pink/20 ring-1 ring-tile-pink' : 'bg-white/5 hover:bg-white/10'
                  }`}
                >
                  <span className={`text-xs font-bold ${isToday ? 'text-tile-pink' : 'text-white/60'}`}>{d.getDate()}</span>
                  <div className="flex-1 flex flex-col gap-0.5 overflow-hidden">
                    {dayPosts.slice(0, 2).map((p) => (
                      <span key={p.id} className={`hidden sm:block text-[10px] px-1 py-0.5 truncate ${STATUS_COLOR[p.status] ?? 'bg-white/10 text-white/60'}`}>
                        {p.title || p.type}
                      </span>
                    ))}
                    {dayPosts.length > 0 && (
                      <span className="sm:hidden text-[10px] text-center bg-tile-pink text-tile-coal font-bold rounded-full w-4 h-4 flex items-center justify-center">{dayPosts.length}</span>
                    )}
                    {dayPosts.length > 2 && (
                      <span className="hidden sm:block text-[10px] text-white/40">+{dayPosts.length - 2} ще</span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-2 text-[10px] font-mono uppercase tracking-wider">
        {Object.entries(STATUS_COLOR).map(([status, cls]) => (
          <span key={status} className={`px-2 py-0.5 ${cls}`}>{status}</span>
        ))}
      </div>

      {/* Selected day detail */}
      {selectedDay && selectedPosts.length > 0 && (
        <div className="panel-pad space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="panel-label">{selectedDay}</h2>
            <button onClick={() => setSelectedDay(null)} className="text-xs text-white/40 hover:text-white">Закрити ✕</button>
          </div>
          {selectedPosts.map((p) => (
            <Link key={p.id} href={`/posts/${p.id}`}
              className="flex items-center justify-between gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 transition-colors">
              <span className="text-sm text-white truncate">{p.title || p.type}</span>
              <span className={`text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 flex-shrink-0 ${STATUS_COLOR[p.status] ?? 'bg-white/10 text-white/60'}`}>{p.status}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
