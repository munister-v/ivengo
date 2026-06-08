'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { api, type Post, type ComplianceFlag } from '@/lib/api'
import { StatusBadge } from '@/components/StatusBadge'

const TYPE_LABELS: Record<string, string> = {
  short_post: 'Короткий пост', article: 'Стаття', poll: 'Опитування',
  review: 'Огляд', faq: 'FAQ', news: 'Новина',
  responsible_gambling: 'Відповідальна гра', myth_fact: 'Міф/Факт',
}

const SEVERITY_CLS: Record<string, string> = {
  high: 'bg-red-100 text-red-700 border-red-200',
  medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  low: 'bg-blue-100 text-blue-700 border-blue-200',
}

export default function PostDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [post, setPost] = useState<Post | null>(null)
  const [content, setContent] = useState('')
  const [title, setTitle] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [actionLoading, setActionLoading] = useState('')
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)
  const [scheduleDate, setScheduleDate] = useState('')
  const [complianceFlags, setComplianceFlags] = useState<ComplianceFlag[]>([])

  useEffect(() => {
    if (!id || id === 'new') { setLoading(false); return }
    api.getPost(id).then((p) => {
      setPost(p)
      setContent(p.content)
      setTitle(p.title ?? '')
      setComplianceFlags(p.complianceChecks?.[0]?.flags ?? [])
    }).finally(() => setLoading(false))
  }, [id])

  function notify(text: string, type: 'success' | 'error' = 'success') {
    setMessage({ text, type })
    setTimeout(() => setMessage(null), 4000)
  }

  async function save() {
    if (!post) return
    setSaving(true)
    try {
      const updated = await api.updatePost(post.id, { content, title: title || undefined })
      setPost(updated)
      notify('Збережено')
    } catch (e: unknown) {
      notify(e instanceof Error ? e.message : 'Помилка', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function action(name: string, fn: () => Promise<Post | { success: boolean }>) {
    setActionLoading(name)
    try {
      const updated = await fn()
      if ('status' in updated) setPost(updated as Post)
      notify(`Виконано: ${name}`)
    } catch (e: unknown) {
      notify(e instanceof Error ? e.message : 'Помилка', 'error')
    } finally {
      setActionLoading('')
    }
  }

  async function runCompliance() {
    if (!post) return
    setActionLoading('compliance')
    try {
      const result = await api.checkCompliance(post.id)
      setComplianceFlags(result.flags)
      notify(result.passed ? '✅ Compliance OK' : '⚠️ Є прапорці', result.passed ? 'success' : 'error')
    } catch (e: unknown) {
      notify(e instanceof Error ? e.message : 'Помилка', 'error')
    } finally {
      setActionLoading('')
    }
  }

  if (loading) return <div className="text-slate-400">Завантаження...</div>
  if (!post) return <div className="text-slate-400">Пост не знайдено</div>

  const canApprove = ['draft', 'pending_review', 'rejected'].includes(post.status)
  const canReject = ['pending_review', 'approved'].includes(post.status)
  const canPublish = ['approved', 'scheduled'].includes(post.status)
  const canSchedule = post.status === 'approved'

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="text-sm text-slate-500 hover:text-slate-700">← Назад</button>
        <h1 className="text-xl font-bold text-slate-800 flex-1 truncate">{post.title || 'Пост без назви'}</h1>
        <StatusBadge status={post.status} />
      </div>

      {message && (
        <div className={`px-4 py-3 rounded-lg text-sm font-medium ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {message.text}
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
        <div className="flex gap-3 text-xs text-slate-500 flex-wrap">
          <span>Тип: <b>{TYPE_LABELS[post.type] ?? post.type}</b></span>
          <span>Мова: <b>{post.language === 'uk' ? '🇺🇦 UA' : '🇷🇺 RU'}</b></span>
          {post.publishedAt && <span>Опубліковано: <b>{new Date(post.publishedAt).toLocaleString('uk-UA')}</b></span>}
          {post.scheduledAt && <span>Заплановано: <b>{new Date(post.scheduledAt).toLocaleString('uk-UA')}</b></span>}
          {post.telegramMessageId && <span>TG ID: <b>{post.telegramMessageId}</b></span>}
          {post.retryCount > 0 && <span>Спроби: <b>{post.retryCount}</b></span>}
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Заголовок</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
            placeholder="Заголовок (необов'язково)"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Текст посту (Telegram Markdown)</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={12}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-sky-500 resize-y"
          />
          <p className="text-xs text-slate-400 mt-1">{content.length} символів</p>
        </div>

        <button
          onClick={save}
          disabled={saving}
          className="bg-slate-700 hover:bg-slate-800 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          {saving ? 'Збереження...' : 'Зберегти'}
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h2 className="text-sm font-semibold text-slate-700 mb-4">Дії</h2>
        <div className="flex gap-2 flex-wrap">
          <Btn label="✅ Approve" color="green" disabled={!canApprove || !!actionLoading}
            loading={actionLoading === 'approve'}
            onClick={() => action('approve', () => api.approvePost(post.id))} />
          <Btn label="❌ Reject" color="red" disabled={!canReject || !!actionLoading}
            loading={actionLoading === 'reject'}
            onClick={() => action('reject', () => api.rejectPost(post.id))} />
          <Btn label="🚀 Publish Now" color="blue" disabled={!canPublish || !!actionLoading}
            loading={actionLoading === 'publish'}
            onClick={() => action('publish', () => api.publishPost(post.id))} />
          <Btn label="🔍 Compliance" color="slate" disabled={!!actionLoading}
            loading={actionLoading === 'compliance'}
            onClick={runCompliance} />
        </div>

        {canSchedule && (
          <div className="mt-4 flex items-center gap-2">
            <input
              type="datetime-local"
              value={scheduleDate}
              onChange={(e) => setScheduleDate(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
            <Btn label="📅 Запланувати" color="slate" disabled={!scheduleDate || !!actionLoading}
              loading={actionLoading === 'schedule'}
              onClick={() => {
                if (!scheduleDate) return Promise.resolve(post)
                return action('schedule', () => api.schedulePost(post.id, new Date(scheduleDate).toISOString()))
              }} />
          </div>
        )}
      </div>

      {complianceFlags.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-3">Compliance прапорці</h2>
          <div className="space-y-2">
            {complianceFlags.map((flag, i) => (
              <div key={i} className={`border rounded-lg px-3 py-2 text-sm ${SEVERITY_CLS[flag.severity]}`}>
                <p className="font-medium">{flag.description}</p>
                <p className="text-xs opacity-70 mt-0.5">Правило: {flag.rule} · Збіг: «{flag.match}»</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {post.publicationLogs && post.publicationLogs.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-3">Журнал публікацій</h2>
          <div className="space-y-2">
            {post.publicationLogs.map((log) => (
              <div key={log.id} className="flex items-center gap-3 text-sm">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${log.status === 'success' ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="text-slate-600">{log.action}</span>
                {log.error && <span className="text-red-500 text-xs truncate">{log.error}</span>}
                <time className="ml-auto text-xs text-slate-400">{new Date(log.createdAt).toLocaleString('uk-UA')}</time>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function Btn({ label, color, disabled, loading, onClick }: {
  label: string; color: string; disabled: boolean; loading: boolean; onClick: () => unknown
}) {
  const cls: Record<string, string> = {
    green: 'bg-green-600 hover:bg-green-700 text-white',
    red: 'bg-red-600 hover:bg-red-700 text-white',
    blue: 'bg-sky-600 hover:bg-sky-700 text-white',
    slate: 'bg-slate-200 hover:bg-slate-300 text-slate-700',
  }
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-40 ${cls[color] ?? cls.slate}`}
    >
      {loading ? '...' : label}
    </button>
  )
}
