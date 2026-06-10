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
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="page-title">🩺 Моніторинг</h1>
        <button onClick={() => load(true)} disabled={refreshing}
          className="text-sm text-tile-coal hover:text-tile-blue font-bold disabled:opacity-50">
          {refreshing ? 'Оновлення...' : '🔄 Оновити'}
        </button>
      </div>

      {/* ── Mondrian tile grid ───────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 lg:gap-0 lg:[&>*]:border lg:[&>*]:border-white">
        {/* ① Status — big tile */}
        <div className={`lg:col-span-2 p-8 flex flex-col justify-center ${health?.ok ? 'bg-tile-blue text-white' : 'bg-tile-rose text-white'}`}>
          <span className="text-xs font-mono uppercase tracking-widest opacity-70 mb-2">System Status</span>
          <h2 className="text-3xl lg:text-4xl font-bold leading-tight mb-2">
            {health?.ok ? 'Усі системи працюють' : 'Виявлені проблеми'}
          </h2>
          <p className="text-sm opacity-80">
            Оновлено: {health ? new Date(health.ts).toLocaleTimeString('uk-UA') : '—'}
          </p>
        </div>

        {/* ② Health checks — coal tile */}
        <div className="bg-tile-coal text-white p-6">
          <div className="text-xs font-mono uppercase tracking-widest text-white/50 mb-3">Перевірки підключень</div>
          <div className="space-y-3">
            {health?.checks.map((c) => (
              <div key={c.name} className="flex items-center gap-3">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${c.ok ? 'bg-emerald-400' : 'bg-rose-400'}`}></span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{c.name}</p>
                  {c.detail && <p className="text-xs text-white/40 truncate">{c.detail}</p>}
                </div>
                {c.latencyMs !== undefined && (
                  <span className="text-xs text-white/40 flex-shrink-0 font-mono">{c.latencyMs}ms</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ③–⑥ Queue stat tiles */}
        {queue && (
          <>
            <TileStat label="Заплановано" value={queue.scheduled} bg="bg-tile-teal" text="text-tile-coal" />
            <TileStat label="На ревʼю" value={queue.pendingReview} bg="bg-tile-pink" text="text-tile-coal" />
            <TileStat label="Помилки" value={queue.failed} bg={queue.failed > 0 ? 'bg-tile-rose' : 'bg-tile-amber'} text={queue.failed > 0 ? 'text-white' : 'text-tile-coal'} />
            <TileStat label="Прострочено" value={queue.overdue} bg={queue.overdue > 0 ? 'bg-tile-rose' : 'bg-tile-blue'} text={queue.overdue > 0 ? 'text-white' : 'text-white'} />
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
      <div className="bg-tile-coal text-white p-6">
        <div className="text-xs font-mono uppercase tracking-widest text-white/50 mb-3">Останні помилки публікації</div>
        {errors.length === 0 ? (
          <p className="text-sm text-white/60 text-center py-4">Помилок немає 🎉</p>
        ) : (
          <div className="divide-y divide-white/10">
            {errors.map((e) => (
              <div key={e.id} className="py-3">
                <div className="flex items-center justify-between gap-2">
                  <Link href={e.post ? `/posts/${e.post.id}` : '#'} className="text-sm font-medium hover:text-tile-pink truncate">
                    {e.post?.title || e.post?.type || 'Пост видалено'}
                  </Link>
                  <span className="text-xs text-white/40 flex-shrink-0 font-mono">{new Date(e.createdAt).toLocaleString('uk-UA')}</span>
                </div>
                {e.error && <p className="text-xs text-rose-400 mt-1 truncate">{e.error}</p>}
                {e.channel && <p className="text-xs text-white/40 mt-0.5">Канал: {e.channel.name}</p>}
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
    <div className={`${bg} ${text} p-6 flex flex-col justify-center min-h-[140px]`}>
      <span className="text-xs font-mono uppercase tracking-widest opacity-60 mb-2">{label}</span>
      <span className="text-4xl font-bold leading-none">{value}</span>
    </div>
  )
}
