'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { api, type StatsData } from '@/lib/api'

const STATUS_META: Record<string, { label: string; bg: string; text: string }> = {
  draft:          { label: 'Чернетки',     bg: 'bg-tile-amber',  text: 'text-tile-coal' },
  pending_review: { label: 'На ревʼю',     bg: 'bg-tile-pink',   text: 'text-tile-coal' },
  approved:       { label: 'Схвалено',     bg: 'bg-tile-teal',   text: 'text-tile-coal' },
  scheduled:      { label: 'Заплановано',  bg: 'bg-tile-blue',   text: 'text-white' },
  published:      { label: 'Опубліковано', bg: 'bg-tile-coal',   text: 'text-white' },
  failed:         { label: 'Помилка',      bg: 'bg-tile-rose',   text: 'text-white' },
  rejected:       { label: 'Відхилено',    bg: 'bg-tile-amber',  text: 'text-tile-coal/60' },
}
const STATUS_ORDER = ['draft', 'pending_review', 'approved', 'scheduled', 'published', 'failed', 'rejected']

export default function DashboardPage() {
  const [stats, setStats] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api.getStats()
      .then(setStats)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="eyebrow animate-pulse">Завантаження…</div>
  if (error) return <div className="panel-pad bg-tile-rose">⚠️ Помилка: {error}</div>
  if (!stats) return null

  return (
    <div className="space-y-3">
      <h1 className="page-title">Dashboard</h1>

      {/* ── Mondrian hero grid ───────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-0 lg:[&>*]:border lg:[&>*]:border-tile-amber">
        <HeroTile label="Всього постів" value={stats.totalPosts} bg="bg-tile-blue" text="text-white" big />
        <HeroTile label="На ревʼю" value={stats.byStatus.pending_review ?? 0} bg="bg-tile-pink" text="text-tile-coal" />
        <HeroTile label="Опубліковано сьогодні" value={stats.publishedToday} bg="bg-tile-teal" text="text-tile-coal" />
        <HeroTile
          label="Помилки сьогодні"
          value={stats.failedToday}
          bg={stats.failedToday > 0 ? 'bg-tile-rose' : 'bg-tile-coal'}
          text="text-white"
        />
      </div>

      {/* ── Status breakdown tiles ───────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 lg:gap-0 lg:[&>*]:border lg:[&>*]:border-tile-amber">
        {STATUS_ORDER.map((status) => {
          const meta = STATUS_META[status]
          return (
            <Link
              key={status}
              href={`/posts?status=${status}`}
              className={`p-4 flex flex-col justify-between min-h-[110px] transition-opacity hover:opacity-90 ${meta.bg} ${meta.text}`}
            >
              <span className="text-4xl font-bold leading-none">{stats.byStatus[status] ?? 0}</span>
              <span className="text-[10px] font-mono uppercase tracking-widest opacity-70 mt-2">{meta.label}</span>
            </Link>
          )
        })}
      </div>

      {/* ── Recent activity — coal tile ──────────────────────── */}
      <div className="panel-pad">
        <div className="panel-label mb-3">Остання активність</div>
        {stats.recentActivity.length === 0 ? (
          <p className="text-sm text-white/40 py-4 text-center">Немає активності</p>
        ) : (
          <div className="divide-y divide-white/10">
            {stats.recentActivity.map((log) => (
              <div key={log.id} className="py-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${log.status === 'success' ? 'bg-tile-teal' : 'bg-tile-rose'}`} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {log.post?.title || `Post #${log.post?.id?.slice(0, 6)}`}
                    </p>
                    <p className="text-xs text-white/40">{log.channel?.name} · {log.action}</p>
                  </div>
                </div>
                <time className="text-xs text-white/40 whitespace-nowrap flex-shrink-0 font-mono">
                  {new Date(log.createdAt).toLocaleString('uk-UA')}
                </time>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function HeroTile({ label, value, bg, text, big }: {
  label: string; value: number; bg: string; text: string; big?: boolean
}) {
  return (
    <div className={`p-6 flex flex-col justify-between min-h-[150px] ${bg} ${text}`}>
      <span className="text-xs font-mono uppercase tracking-widest opacity-60">{label}</span>
      <span className={`font-bold leading-none ${big ? 'text-6xl' : 'text-5xl'}`}>{value}</span>
    </div>
  )
}
