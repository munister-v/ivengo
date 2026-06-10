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
    <div className="space-y-3 max-w-4xl">
      <h1 className="page-title">Аналітика <span className="text-tile-coal/40 font-normal text-lg">останні {data.windowDays} днів</span></h1>

      {/* Success rate tiles */}
      <div className="grid grid-cols-3 gap-3 lg:gap-0 lg:[&>*]:border lg:[&>*]:border-tile-amber">
        <StatTile label="Успішні" value={data.successRate.success} bg="bg-tile-teal" text="text-tile-coal" />
        <StatTile label="Помилки" value={data.successRate.error} bg={data.successRate.error > 0 ? 'bg-tile-rose' : 'bg-tile-coal'} text="text-white" />
        <StatTile label="Успішність" value={successRatePct !== null ? `${successRatePct}%` : '—'} bg="bg-tile-blue" text="text-white" />
      </div>

      {/* Posts per day */}
      <div className="panel-pad">
        <div className="panel-label mb-4">Опубліковано постів по днях</div>
        <div className="flex items-end gap-1 h-32">
          {data.perDay.map((d) => (
            <div key={d.date} className="flex-1 flex flex-col items-center gap-1 group relative">
              <div
                className="w-full bg-tile-pink hover:bg-tile-teal transition-colors min-h-[2px]"
                style={{ height: `${(d.count / maxPerDay) * 100}%` }}
                title={`${d.date}: ${d.count}`}
              />
              <span className="text-[9px] text-white/40 -rotate-45 origin-top-left whitespace-nowrap mt-1 font-mono">
                {d.date.slice(5)}
              </span>
            </div>
          ))}
        </div>
      </div>

      <BarSection title="Пости за типом" data={data.byType} labels={TYPE_LABELS} />
      <BarSection title="Пости за мовою" data={data.byLanguage} labels={{ uk: '🇺🇦 Українська', ru: '🇷🇺 Російська' }} />
      <BarSection title="Пости за статусом" data={data.byStatus} />

      {/* Channel performance */}
      <div className="panel-pad">
        <div className="panel-label mb-3">Ефективність каналів</div>
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
                    <span className="font-medium text-white">{name}</span>
                    <span className="text-xs text-white/40 font-mono">{stats.success} ✅ / {stats.error} ⚠️ ({pct}%)</span>
                  </div>
                  <div className="w-full h-2 bg-white/10 overflow-hidden flex">
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
    <div className={`p-6 flex flex-col justify-between min-h-[120px] ${bg} ${text}`}>
      <span className="text-xs font-mono uppercase tracking-widest opacity-60">{label}</span>
      <span className="text-4xl font-bold leading-none">{value}</span>
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
        <p className="text-sm text-white/40">Даних ще немає</p>
      ) : (
        <div className="space-y-2">
          {entries.map(([key, value]) => (
            <div key={key} className="flex items-center gap-3">
              <span className="text-xs text-white/60 w-36 flex-shrink-0 truncate">{labels?.[key] ?? key}</span>
              <div className="flex-1 h-3 bg-white/10 overflow-hidden">
                <div className="h-full bg-tile-blue" style={{ width: `${(value / max) * 100}%` }} />
              </div>
              <span className="text-xs font-bold text-white/70 w-6 text-right flex-shrink-0 font-mono">{value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
