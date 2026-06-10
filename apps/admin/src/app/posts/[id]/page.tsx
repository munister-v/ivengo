'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { api, type Post, type ComplianceFlag } from '@/lib/api'
import { StatusBadge } from '@/components/StatusBadge'
import { ChannelPicker } from '@/components/ChannelPicker'

const TYPE_LABELS: Record<string, string> = {
  short_post: 'Короткий пост', article: 'Стаття', poll: 'Опитування',
  review: 'Огляд', faq: 'FAQ', news: 'Новина',
  responsible_gambling: 'Відповідальна гра', myth_fact: 'Міф/Факт',
  user_story: '🧑 Історія виграшу', urgency_offer: '⏰ Терміновий офер',
  engagement_poll: '📊 Engagement Poll',
}

const SEVERITY_CLS: Record<string, string> = {
  high: 'bg-tile-rose text-white',
  medium: 'bg-tile-pink text-tile-coal',
  low: 'bg-tile-blue text-white',
}

export default function PostDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [post, setPost] = useState<Post | null>(null)
  const [content, setContent] = useState('')
  const [title, setTitle] = useState('')
  const [channelIds, setChannelIds] = useState<string[]>([])
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
      setChannelIds(p.channelIds ?? [])
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
      const updated = await api.updatePost(post.id, { content, title: title || undefined, channelIds })
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

  if (loading) return <div className="eyebrow animate-pulse">Завантаження…</div>
  if (!post) return <div className="eyebrow">Пост не знайдено</div>

  const canApprove = ['draft', 'pending_review', 'rejected'].includes(post.status)
  const canReject = ['pending_review', 'approved'].includes(post.status)
  const canPublish = ['approved', 'scheduled'].includes(post.status)
  const canSchedule = post.status === 'approved'

  return (
    <div className="max-w-3xl space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="text-sm text-tile-coal/60 hover:text-tile-coal font-medium">← Назад</button>
        <h1 className="page-title text-xl flex-1 truncate">{post.title || 'Пост без назви'}</h1>
        <StatusBadge status={post.status} />
      </div>

      {message && (
        <div className={`px-4 py-3 text-sm font-medium ${message.type === 'success' ? 'bg-tile-teal text-tile-coal' : 'bg-tile-rose text-white'}`}>
          {message.text}
        </div>
      )}

      <div className="panel-pad space-y-4">
        <div className="flex gap-3 text-xs text-white/50 flex-wrap font-mono">
          <span>Тип: <b className="text-white/80">{TYPE_LABELS[post.type] ?? post.type}</b></span>
          <span>Мова: <b className="text-white/80">{post.language === 'uk' ? '🇺🇦 UA' : '🇷🇺 RU'}</b></span>
          {post.publishedAt && <span>Опубл.: <b className="text-white/80">{new Date(post.publishedAt).toLocaleString('uk-UA')}</b></span>}
          {post.scheduledAt && <span>Заплан.: <b className="text-white/80">{new Date(post.scheduledAt).toLocaleString('uk-UA')}</b></span>}
          {post.telegramMessageId && <span>TG ID: <b className="text-white/80">{post.telegramMessageId}</b></span>}
          {post.retryCount > 0 && <span>Спроби: <b className="text-white/80">{post.retryCount}</b></span>}
        </div>

        <div>
          <label className="lbl">Заголовок</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className="fld" placeholder="Заголовок (необов'язково)" />
        </div>

        <div>
          <label className="lbl">Текст посту (Telegram Markdown)</label>
          <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={12} className="fld font-mono resize-y" />
          <p className="text-xs text-white/40 mt-1 font-mono">{content.length} символів</p>
        </div>

        {post.poll && (
          <div className="bg-white/5 p-3">
            <p className="panel-label mb-2">📊 Опитування</p>
            <p className="text-sm font-medium text-white">{post.poll.question}</p>
            <div className="mt-2 space-y-1">
              {post.poll.options.map((opt: string, i: number) => (
                <div key={i} className="text-xs text-white/60 flex items-center gap-2">
                  <span className="w-5 h-5 bg-white/10 flex items-center justify-center">{i + 1}</span>
                  {opt}
                </div>
              ))}
            </div>
          </div>
        )}

        {post.buttons && (post.buttons as { text: string; url: string }[]).length > 0 && (
          <div>
            <p className="panel-label mb-2">Inline кнопки</p>
            <div className="space-y-1">
              {(post.buttons as { text: string; url: string }[]).map((btn, i) => (
                <div key={i} className="bg-tile-blue text-white text-sm font-medium px-4 py-2.5 text-center">
                  {btn.text}
                  <span className="block text-xs opacity-70 truncate">{btn.url}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <ChannelPicker value={channelIds} onChange={setChannelIds} />

        <button onClick={save} disabled={saving} className="btn">{saving ? 'Збереження...' : 'Зберегти'}</button>
      </div>

      <div className="panel-pad">
        <h2 className="panel-label mb-4">Дії</h2>
        <div className="flex gap-2 flex-wrap">
          <Btn label="✅ Approve" color="teal" disabled={!canApprove || !!actionLoading} loading={actionLoading === 'approve'} onClick={() => action('approve', () => api.approvePost(post.id))} />
          <Btn label="❌ Reject" color="rose" disabled={!canReject || !!actionLoading} loading={actionLoading === 'reject'} onClick={() => action('reject', () => api.rejectPost(post.id))} />
          <Btn label="🚀 Publish Now" color="blue" disabled={!canPublish || !!actionLoading} loading={actionLoading === 'publish'} onClick={() => action('publish', () => api.publishPost(post.id))} />
          <Btn label="🔍 Compliance" color="line" disabled={!!actionLoading} loading={actionLoading === 'compliance'} onClick={runCompliance} />
        </div>

        {canSchedule && (
          <div className="mt-4 flex items-center gap-2 flex-wrap">
            <input type="datetime-local" value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)} className="fld w-auto" />
            <Btn label="📅 Запланувати" color="line" disabled={!scheduleDate || !!actionLoading} loading={actionLoading === 'schedule'}
              onClick={() => {
                if (!scheduleDate) return Promise.resolve(post)
                return action('schedule', () => api.schedulePost(post.id, new Date(scheduleDate).toISOString()))
              }} />
          </div>
        )}
      </div>

      {complianceFlags.length > 0 && (
        <div className="panel-pad">
          <h2 className="panel-label mb-3">Compliance прапорці</h2>
          <div className="space-y-2">
            {complianceFlags.map((flag, i) => (
              <div key={i} className={`px-3 py-2 text-sm ${SEVERITY_CLS[flag.severity]}`}>
                <p className="font-medium">{flag.description}</p>
                <p className="text-xs opacity-70 mt-0.5">Правило: {flag.rule} · Збіг: «{flag.match}»</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {post.publicationLogs && post.publicationLogs.length > 0 && (
        <div className="panel-pad">
          <h2 className="panel-label mb-3">Журнал публікацій</h2>
          <div className="space-y-2">
            {post.publicationLogs.map((log) => (
              <div key={log.id} className="flex items-center gap-3 text-sm">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${log.status === 'success' ? 'bg-tile-teal' : 'bg-tile-rose'}`} />
                <span className="text-white/70">{log.action}</span>
                {log.error && <span className="text-tile-rose text-xs truncate">{log.error}</span>}
                <time className="ml-auto text-xs text-white/40 font-mono">{new Date(log.createdAt).toLocaleString('uk-UA')}</time>
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
    teal: 'bg-tile-teal hover:opacity-90 text-tile-coal',
    rose: 'bg-tile-rose hover:opacity-90 text-white',
    blue: 'bg-tile-blue hover:opacity-90 text-white',
    line: 'border border-white/20 text-white/80 hover:bg-white/10',
  }
  return (
    <button onClick={onClick} disabled={disabled || loading}
      className={`text-sm font-bold px-4 py-2 transition-opacity disabled:opacity-40 ${cls[color] ?? cls.line}`}>
      {loading ? '...' : label}
    </button>
  )
}
