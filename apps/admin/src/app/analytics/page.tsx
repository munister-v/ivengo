'use client'
import { useEffect, useState } from 'react'
import { api, type AnalyticsOverview } from '@/lib/api'

const TYPE_LABELS: Record<string, string> = {
  short_post: 'Короткий пост',
  article: 'Стаття',
  poll: 'Квіз',
  review: 'Огляд',
  faq: 'FAQ',
  news: 'Новина',
  responsible_gambling: 'Відповідальна гра',
  myth_fact: 'Міф vs Факт',
  user_story: 'Історія гравця',
  urgency_offer: 'Терміновий офер',
  engagement_poll: 'Опитування',
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsOverview | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getAnalyticsOverview().then(setData).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="eyebrow animate-pulse">Завантаження…</div>
  if (!data) return <div className="panel-pad bg-tile-rose">Не вдалось завантажити аналітику</div>

  const maxPerDay = Math.max(1, ...data.perDay.map((d) => d.count))
  const successRatePct = data.successRate.total > 0
    ? Math.round((data.successRate.success / data.successRate.total) * 100)
    : null

  return (
    <div className="space-y-7">
      <header className="grid gap-5 border-b border-tile-coal/30 pb-7 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <p className="eyebrow mb-3">Performance archive · {data.windowDays} days</p>
          <h1 className="page-title">Аналітика</h1>
          <p className="page-sub mt-3 max-w-xl">Публікаційний ритм, надійність каналів і структура контенту в одному зрізі.</p>
        </div>
        <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-tile-coal/45">Updated now</div>
      </header>

      <div className="grid border-l border-t border-tile-coal/35 sm:grid-cols-3">
        <StatTile label="Успішні" value={data.successRate.success} bg="bg-tile-teal/45" text="text-tile-coal" />
        <StatTile label="Помилки" value={data.successRate.error} bg={data.successRate.error > 0 ? 'bg-tile-rose' : 'bg-[#fffdf9]'} text={data.successRate.error > 0 ? 'text-white' : 'text-tile-coal'} />
        <StatTile label="Успішність" value={successRatePct !== null ? `${successRatePct}%` : '—'} bg="bg-tile-coal" text="text-tile-amber" />
      </div>

      <div className="panel-pad">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <div className="panel-label">Publishing rhythm</div>
            <h2 className="mt-2 text-2xl">Пости за днями</h2>
          </div>
          <span className="font-mono text-[9px] uppercase tracking-wider text-tile-coal/40">Fig. 01</span>
        </div>
        <div className="flex h-48 items-end gap-1.5 border-b border-tile-coal/25">
          {data.perDay.map((d) => (
            <div key={d.date} className="flex-1 flex flex-col items-center gap-1 group relative">
              <div
                className="min-h-[2px] w-full bg-tile-coal transition-colors hover:bg-tile-pink"
                style={{ height: `${(d.count / maxPerDay) * 100}%` }}
                title={`${d.date}: ${d.count}`}
              />
              <span className="mt-2 hidden whitespace-nowrap font-mono text-[8px] text-tile-coal/40 sm:block">
                {d.date.slice(5)}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <BarSection title="Пости за типом" data={data.byType} labels={TYPE_LABELS} />
        <BarSection title="Пости за мовою" data={data.byLanguage} labels={{ uk: 'Українська', ru: 'Російська' }} />
        <BarSection title="Пости за статусом" data={data.byStatus} />
      </div>

      {/* Channel performance */}
      <div className="panel-pad">
        <div className="panel-label mb-2">Channel reliability</div>
        <h2 className="mb-5 text-2xl">Ефективність каналів</h2>
        {Object.keys(data.channelStats).length === 0 ? (
          <p className="text-sm text-white/40">Даних ще немає</p>
        ) : (
          <div className="space-y-3">
            {Object.entries(data.channelStats).map(([name, stats]) => {
              const total = stats.success + stats.error
              const pct = total > 0 ? Math.round((stats.success / total) * 100) : 0
              return (
                <div key={name}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span>{name}</span>
                    <span className="text-xs text-tile-coal/45 font-mono">{stats.success} успішно / {stats.error} помилок · {pct}%</span>
                  </div>
                  <div className="flex h-2 w-full overflow-hidden bg-tile-coal/10">
                    <div className="bg-tile-teal h-full" style={{ width: `${pct}%` }} />
                    <div className="bg-tile-rose h-full" style={{ width: `${100 - pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function StatTile({ label, value, bg, text }: { label: string; value: number | string; bg: string; text: string }) {
  return (
    <div className={`flex min-h-[170px] flex-col justify-between border-b border-r border-tile-coal/35 p-6 ${bg} ${text}`}>
      <span className="font-mono text-[9px] uppercase tracking-[0.18em] opacity-60">{label}</span>
      <span className="text-6xl font-normal leading-none">{value}</span>
    </div>
  )
}

function BarSection({ title, data, labels }: { title: string; data: Record<string, number>; labels?: Record<string, string> }) {
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1])
  const max = Math.max(1, ...entries.map(([, v]) => v))

  return (
    <div className="panel-pad">
      <div className="panel-label mb-3">{title}</div>
      {entries.length === 0 ? (
        <p className="text-sm text-tile-coal/40">Даних ще немає</p>
      ) : (
        <div className="space-y-2">
          {entries.map(([key, value]) => (
            <div key={key} className="flex items-center gap-3">
              <span className="w-28 flex-shrink-0 truncate text-xs text-tile-coal/60">{labels?.[key] ?? key}</span>
              <div className="h-2 flex-1 overflow-hidden bg-tile-coal/10">
                <div className="h-full bg-tile-coal" style={{ width: `${(value / max) * 100}%` }} />
              </div>
              <span className="w-6 flex-shrink-0 text-right font-mono text-xs text-tile-coal/70">{value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
