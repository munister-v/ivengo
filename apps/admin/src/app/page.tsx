'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { api, type StatsData } from '@/lib/api'

const STATUS_META: Record<string, { label: string; bg: string; text: string }> = {
  draft:          { label: 'Чернетки',     bg: 'bg-[#fffdf9]',    text: 'text-tile-coal' },
  pending_review: { label: 'На ревʼю',     bg: 'bg-tile-pink/45', text: 'text-tile-coal' },
  approved:       { label: 'Схвалено',     bg: 'bg-tile-teal/55', text: 'text-tile-coal' },
  scheduled:      { label: 'Заплановано',  bg: 'bg-tile-blue',    text: 'text-white' },
  published:      { label: 'Опубліковано', bg: 'bg-tile-coal',    text: 'text-white' },
  failed:         { label: 'Помилка',      bg: 'bg-tile-rose',    text: 'text-white' },
  rejected:       { label: 'Відхилено',    bg: 'bg-tile-amber',   text: 'text-tile-coal/60' },
}
const STATUS_ORDER = ['draft', 'pending_review', 'approved', 'scheduled', 'published', 'failed', 'rejected']

export default function DashboardPage() {
  const [stats, setStats] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [hasChannels, setHasChannels] = useState<boolean | null>(null)

  useEffect(() => {
    api.getStats()
      .then(setStats)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
    api.getChannels()
      .then((channels) => setHasChannels(channels.length > 0))
      .catch(() => setHasChannels(null))
  }, [])

  if (loading) return <div className="eyebrow animate-pulse">Завантаження…</div>
  if (error) return <div className="panel-pad bg-tile-rose">⚠️ Помилка: {error}</div>
  if (!stats) return null

  return (
    <div className="space-y-8">
      <header className="grid gap-6 border-b border-tile-coal/35 pb-8 lg:grid-cols-[1.4fr_1fr] lg:items-end">
        <div>
          <p className="eyebrow mb-3">Ivengo · Editorial control room</p>
          <h1 className="page-title max-w-3xl">Редакційний огляд</h1>
        </div>
        <p className="max-w-xl text-lg italic leading-relaxed text-tile-coal/65 lg:justify-self-end">
          Плануйте, створюйте та публікуйте контент у єдиному спокійному робочому просторі.
        </p>
      </header>

      {hasChannels === false && (
        <Link
          href="/channels"
          className="group grid gap-3 border border-tile-coal bg-[#fffdf9] p-5 text-tile-coal hover:bg-tile-coal hover:text-tile-amber sm:grid-cols-[1fr_auto] sm:items-center"
        >
          <div>
            <p className="eyebrow !text-current opacity-60">Setup required</p>
            <p className="mt-2 text-xl">Підключіть Telegram-бота і перший канал</p>
          </div>
          <span className="font-mono text-xs uppercase tracking-[0.16em]">Open channels →</span>
        </Link>
      )}

      <div className="grid border-l border-t border-tile-coal/45 sm:grid-cols-2 xl:grid-cols-4">
        <HeroTile label="Всього постів" value={stats.totalPosts} bg="bg-tile-coal" text="text-tile-amber" big index="Fig. 01" />
        <HeroTile label="На ревʼю" value={stats.byStatus.pending_review ?? 0} bg="bg-[#fffdf9]" text="text-tile-coal" index="Fig. 02" />
        <HeroTile label="Опубліковано сьогодні" value={stats.publishedToday} bg="bg-tile-teal/45" text="text-tile-coal" index="Fig. 03" />
        <HeroTile
          label="Помилки сьогодні"
          value={stats.failedToday}
          bg={stats.failedToday > 0 ? 'bg-tile-rose' : 'bg-tile-coal'}
          text="text-tile-amber"
          index="Fig. 04"
        />
      </div>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <p className="eyebrow">Publication index</p>
          <Link href="/posts" className="font-mono text-[10px] uppercase tracking-[0.16em] hover:opacity-55">Усі пости →</Link>
        </div>
        <div className="grid grid-cols-2 border-l border-t border-tile-coal/35 sm:grid-cols-4 xl:grid-cols-7">
        {STATUS_ORDER.map((status) => {
          const meta = STATUS_META[status]
          return (
            <Link
              key={status}
              href={`/posts?status=${status}`}
              className={`flex min-h-[120px] flex-col justify-between border-b border-r border-tile-coal/35 p-4 hover:brightness-95 ${meta.bg} ${meta.text}`}
            >
              <span className="text-4xl font-normal leading-none">{stats.byStatus[status] ?? 0}</span>
              <span className="mt-2 font-mono text-[9px] uppercase tracking-[0.18em] opacity-70">{meta.label}</span>
            </Link>
          )
        })}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[0.72fr_1.28fr]">
        <aside className="flex min-h-[280px] flex-col justify-between border border-tile-coal/35 bg-tile-amber p-6">
          <p className="eyebrow">Editorial note</p>
          <p className="max-w-md text-2xl italic leading-snug text-tile-coal/70">
            “Сильний контент починається не з гучності, а з ясного редакційного наміру.”
          </p>
          <Link href="/constructor" className="font-mono text-[10px] uppercase tracking-[0.18em] hover:opacity-55">
            Створити новий матеріал →
          </Link>
        </aside>

        <section className="border border-tile-coal/35 bg-[#fffdf9] p-5 lg:p-6">
          <div className="mb-5 flex items-center justify-between border-b border-tile-coal/20 pb-4">
            <div>
              <p className="eyebrow">Live archive</p>
              <h2 className="mt-2 text-2xl">Остання активність</h2>
            </div>
            <Link href="/logs" className="font-mono text-[10px] uppercase tracking-[0.16em] hover:opacity-55">Journal →</Link>
          </div>
          {stats.recentActivity.length === 0 ? (
            <p className="py-10 text-center italic text-tile-coal/45">Архів активності поки порожній</p>
          ) : (
            <div className="divide-y divide-tile-coal/15">
              {stats.recentActivity.map((log) => (
                <div key={log.id} className="grid gap-2 py-4 sm:grid-cols-[1fr_auto] sm:items-center sm:gap-5">
                  <div className="flex min-w-0 items-center gap-4">
                    <span className={`h-2 w-2 flex-shrink-0 rounded-full ${log.status === 'success' ? 'bg-tile-teal' : 'bg-tile-rose'}`} />
                    <div className="min-w-0">
                      <p className="truncate text-base">{log.post?.title || `Post #${log.post?.id?.slice(0, 6)}`}</p>
                      <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-tile-coal/45">{log.channel?.name} · {log.action}</p>
                    </div>
                  </div>
                  <time className="pl-6 font-mono text-[9px] uppercase tracking-wider text-tile-coal/45 sm:pl-0">
                    {new Date(log.createdAt).toLocaleString('uk-UA')}
                  </time>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

function HeroTile({ label, value, bg, text, big, index }: {
  label: string; value: number; bg: string; text: string; big?: boolean; index: string
}) {
  return (
    <div className={`flex min-h-[190px] flex-col justify-between border-b border-r border-tile-coal/45 p-5 lg:p-6 ${bg} ${text}`}>
      <div className="flex items-start justify-between gap-3">
        <span className="font-mono text-[9px] uppercase tracking-[0.18em] opacity-65">{label}</span>
        <span className="font-mono text-[8px] uppercase tracking-widest opacity-45">{index}</span>
      </div>
      <span className={`font-normal leading-none ${big ? 'text-7xl' : 'text-6xl'}`}>{value}</span>
    </div>
  )
}
