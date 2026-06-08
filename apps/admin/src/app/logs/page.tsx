'use client'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { api, type PublicationLog } from '@/lib/api'

export default function LogsPage() {
  const [logs, setLogs] = useState<PublicationLog[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.getLogs({ status: statusFilter || undefined, page })
      setLogs(res.logs)
      setTotal(res.total)
    } finally {
      setLoading(false)
    }
  }, [statusFilter, page])

  useEffect(() => { load() }, [load])

  const totalPages = Math.ceil(total / 50)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Журнал публікацій <span className="text-slate-400 font-normal text-lg">({total})</span></h1>
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
          className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-sky-500">
          <option value="">Всі статуси</option>
          <option value="success">Успішні</option>
          <option value="error">Помилки</option>
        </select>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
        {loading && <p className="p-6 text-slate-400 text-sm text-center">Завантаження...</p>}
        {!loading && logs.length === 0 && <p className="p-6 text-slate-400 text-sm text-center">Журнал порожній</p>}
        {logs.map((log) => (
          <div key={log.id} className="p-4 flex items-start gap-4">
            <span className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${log.status === 'success' ? 'bg-green-500' : 'bg-red-500'}`} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-sm font-medium text-slate-700 capitalize">{log.action}</span>
                <span className={`text-xs font-medium ${log.status === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                  {log.status === 'success' ? '✓ OK' : '✗ Error'}
                </span>
                {log.channel && <span className="text-xs text-slate-400">· {log.channel.name}</span>}
              </div>
              {log.post && (
                <Link href={`/posts/${log.post.id}`} className="text-xs text-sky-600 hover:text-sky-700 truncate block max-w-md">
                  {log.post.title || `Post: ${log.post.id.slice(0, 10)}...`}
                </Link>
              )}
              {log.error && <p className="text-xs text-red-500 mt-0.5 truncate max-w-lg">{log.error}</p>}
              {log.telegramMessageId && <p className="text-xs text-slate-400 mt-0.5">TG ID: {log.telegramMessageId}</p>}
            </div>
            <time className="text-xs text-slate-400 whitespace-nowrap flex-shrink-0">
              {new Date(log.createdAt).toLocaleString('uk-UA')}
            </time>
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center gap-2">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
            className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-100">← Назад</button>
          <span className="text-sm text-slate-500">{page} / {totalPages}</span>
          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-100">Далі →</button>
        </div>
      )}
    </div>
  )
}
