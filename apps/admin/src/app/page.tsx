'use client'
import { useEffect, useState } from 'react'
import { api, type StatsData } from '@/lib/api'
import { StatusBadge } from '@/components/StatusBadge'

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

  if (loading) return <div className="text-slate-400">Завантаження...</div>
  if (error) return <div className="text-red-500">Помилка: {error}</div>
  if (!stats) return null

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Всього постів" value={stats.totalPosts} icon="📝" />
        <StatCard label="На ревʼю" value={stats.byStatus.pending_review ?? 0} icon="🔍" />
        <StatCard label="Опубліковано сьогодні" value={stats.publishedToday} icon="✅" color="green" />
        <StatCard label="Помилки сьогодні" value={stats.failedToday} icon="⚠️" color="red" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {STATUS_ORDER.map((status) => (
          <div key={status} className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
            <StatusBadge status={status} />
            <span className="text-xl font-bold text-slate-700">{stats.byStatus[status] ?? 0}</span>
          </div>
        ))}
      </div>

      <div>
        <h2 className="text-lg font-semibold text-slate-700 mb-3">Остання активність</h2>
        <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
          {stats.recentActivity.length === 0 && (
            <p className="p-4 text-slate-400 text-sm">Немає активності</p>
          )}
          {stats.recentActivity.map((log) => (
            <div key={log.id} className="p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${log.status === 'success' ? 'bg-green-500' : 'bg-red-500'}`} />
                <div>
                  <p className="text-sm font-medium text-slate-700 truncate max-w-xs">
                    {log.post?.title || `Post #${log.post?.id?.slice(0, 6)}`}
                  </p>
                  <p className="text-xs text-slate-400">{log.channel?.name} · {log.action}</p>
                </div>
              </div>
              <time className="text-xs text-slate-400 whitespace-nowrap">
                {new Date(log.createdAt).toLocaleString('uk-UA')}
              </time>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, icon, color = 'blue' }: {
  label: string; value: number; icon: string; color?: 'blue' | 'green' | 'red'
}) {
  const colors = {
    blue: 'bg-sky-50 text-sky-700',
    green: 'bg-green-50 text-green-700',
    red: 'bg-red-50 text-red-700',
  }
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className={`inline-flex items-center justify-center w-10 h-10 rounded-lg text-xl mb-3 ${colors[color]}`}>
        {icon}
      </div>
      <p className="text-2xl font-bold text-slate-800">{value}</p>
      <p className="text-sm text-slate-500 mt-0.5">{label}</p>
    </div>
  )
}
