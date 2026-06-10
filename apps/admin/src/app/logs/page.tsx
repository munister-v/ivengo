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
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="page-title">Журнал публікацій <span className="text-tile-coal/40 font-normal text-lg">({total})</span></h1>
        <div className="panel-pad !py-2 !px-3">
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }} className="fld w-auto">
            <option value="">Всі статуси</option>
            <option value="success">Успішні</option>
            <option value="error">Помилки</option>
          </select>
        </div>
      </div>

      <div className="panel divide-y divide-white/10">
        {loading && <p className="p-6 text-white/40 text-sm text-center">Завантаження…</p>}
        {!loading && logs.length === 0 && <p className="p-6 text-white/40 text-sm text-center">Журнал порожній</p>}
        {logs.map((log) => (
          <div key={log.id} className="p-4 flex items-start gap-4">
            <span className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${log.status === 'success' ? 'bg-tile-teal' : 'bg-tile-rose'}`} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                <span className="text-sm font-medium text-white capitalize">{log.action}</span>
                <span className={`text-xs font-mono font-bold ${log.status === 'success' ? 'text-tile-teal' : 'text-tile-rose'}`}>
                  {log.status === 'success' ? '✓ OK' : '✗ ERROR'}
                </span>
                {log.channel && <span className="text-xs text-white/40">· {log.channel.name}</span>}
              </div>
              {log.post && (
                <Link href={`/posts/${log.post.id}`} className="text-xs text-tile-pink hover:text-tile-teal truncate block max-w-md">
                  {log.post.title || `Post: ${log.post.id.slice(0, 10)}...`}
                </Link>
              )}
              {log.error && <p className="text-xs text-tile-rose mt-0.5 truncate max-w-lg">{log.error}</p>}
              {log.telegramMessageId && <p className="text-xs text-white/40 mt-0.5 font-mono">TG ID: {log.telegramMessageId}</p>}
            </div>
            <time className="text-xs text-white/40 whitespace-nowrap flex-shrink-0 font-mono">
              {new Date(log.createdAt).toLocaleString('uk-UA')}
            </time>
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center gap-2">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="btn-coal disabled:opacity-40">← Назад</button>
          <span className="text-sm text-tile-coal/60 font-mono">{page} / {totalPages}</span>
          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="btn-coal disabled:opacity-40">Далі →</button>
        </div>
      )}
    </div>
  )
}
