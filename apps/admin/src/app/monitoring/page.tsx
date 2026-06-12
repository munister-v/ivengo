'use client'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { api, type HealthResponse, type QueueResponse, type PublicationLog } from '@/lib/api'

export default function MonitoringPage() {
  const [health, setHealth] = useState<HealthResponse | null>(null)
  const [queue, setQueue] = useState<QueueResponse | null>(null)
  const [errors, setErrors] = useState<PublicationLog[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true)
    try {
      const [h, q, e] = await Promise.all([
        api.getHealth(),
        api.getQueue(),
        api.getMonitoringErrors(),
      ])
      setHealth(h)
      setQueue(q)
      setErrors(e.errors)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    load()
    const interval = setInterval(() => load(true), 30000)
    return () => clearInterval(interval)
  }, [load])

  if (loading) return <div className="eyebrow animate-pulse">Завантаження…</div>

  return (
    <div className="space-y-7">
      <header className="flex flex-wrap items-end justify-between gap-5 border-b border-tile-coal/30 pb-7">
        <div>
          <p className="eyebrow mb-3">Operations desk · Live</p>
          <h1 className="page-title">Моніторинг</h1>
          <p className="page-sub mt-3">Стан сервісів, черга публікацій і останні помилки.</p>
        </div>
        <button onClick={() => load(true)} disabled={refreshing}
          className="btn-coal min-h-11">
          {refreshing ? 'Оновлення…' : 'Оновити'}
        </button>
      </header>

      <div className="grid border-l border-t border-tile-coal/35 lg:grid-cols-3">
        <div className={`flex min-h-[260px] flex-col justify-between border-b border-r border-tile-coal/35 p-8 lg:col-span-2 ${health?.ok ? 'bg-tile-teal/45 text-tile-coal' : 'bg-tile-rose text-white'}`}>
          <span className="font-mono text-[9px] uppercase tracking-[0.18em] opacity-65">System status</span>
          <h2 className="max-w-2xl text-4xl font-normal leading-tight lg:text-6xl">
            {health?.ok ? 'Усі системи працюють' : 'Виявлені проблеми'}
          </h2>
          <p className="font-mono text-[9px] uppercase tracking-wider opacity-60">
            Оновлено: {health ? new Date(health.ts).toLocaleTimeString('uk-UA') : '—'}
          </p>
        </div>

        <div className="border-b border-r border-tile-coal/35 bg-[#fffdf9] p-6 text-tile-coal">
          <div className="panel-label mb-5">Connection checks</div>
          <div className="divide-y divide-tile-coal/15">
            {health?.checks.map((c) => (
              <div key={c.name} className="flex items-center gap-3 py-3">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${c.ok ? 'bg-tile-teal' : 'bg-tile-rose'}`}></span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{c.name}</p>
                  {c.detail && <p className="text-xs text-tile-coal/40 truncate">{c.detail}</p>}
                </div>
                {c.latencyMs !== undefined && (
                  <span className="text-xs text-tile-coal/40 flex-shrink-0 font-mono">{c.latencyMs}ms</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ③–⑥ Queue stat tiles */}
        {queue && (
          <>
            <TileStat label="Заплановано" value={queue.scheduled} bg="bg-[#fffdf9]" text="text-tile-coal" />
            <TileStat label="На ревʼю" value={queue.pendingReview} bg="bg-tile-pink/35" text="text-tile-coal" />
            <TileStat label="Помилки" value={queue.failed} bg={queue.failed > 0 ? 'bg-tile-rose' : 'bg-tile-amber'} text={queue.failed > 0 ? 'text-white' : 'text-tile-coal'} />
            <TileStat label="Прострочено" value={queue.overdue} bg={queue.overdue > 0 ? 'bg-tile-rose' : 'bg-tile-coal'} text="text-white" />
          </>
        )}
      </div>

      {queue?.nextScheduled && (
        <p className="text-xs text-tile-coal/60">
          Наступна публікація: <Link href={`/posts/${queue.nextScheduled.id}`} className="text-tile-blue hover:text-tile-pink font-bold">
            {queue.nextScheduled.title || queue.nextScheduled.type}
          </Link> о {new Date(queue.nextScheduled.scheduledAt).toLocaleString('uk-UA')}
        </p>
      )}

      {/* Recent errors — coal tile */}
      <div className="panel-pad">
        <div className="panel-label mb-2">Error archive</div>
        <h2 className="mb-5 text-2xl">Останні помилки публікації</h2>
        {errors.length === 0 ? (
          <p className="border border-tile-teal bg-tile-teal/20 py-5 text-center text-sm">Помилок немає</p>
        ) : (
          <div className="divide-y divide-white/10">
            {errors.map((e) => (
              <div key={e.id} className="py-3">
                <div className="flex items-center justify-between gap-2">
                  <Link href={e.post ? `/posts/${e.post.id}` : '#'} className="text-sm hover:opacity-55 truncate">
                    {e.post?.title || e.post?.type || 'Пост видалено'}
                  </Link>
                  <span className="text-xs text-tile-coal/40 flex-shrink-0 font-mono">{new Date(e.createdAt).toLocaleString('uk-UA')}</span>
                </div>
                {e.error && <p className="text-xs text-rose-400 mt-1 truncate">{e.error}</p>}
                {e.channel && <p className="text-xs text-tile-coal/40 mt-0.5">Канал: {e.channel.name}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function TileStat({ label, value, bg, text }: { label: string; value: number; bg: string; text: string }) {
  return (
    <div className={`${bg} ${text} flex min-h-[150px] flex-col justify-between border-b border-r border-tile-coal/35 p-6`}>
      <span className="font-mono text-[9px] uppercase tracking-[0.18em] opacity-60">{label}</span>
      <span className="text-5xl font-normal leading-none">{value}</span>
    </div>
  )
}
