'use client'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { api, type Post } from '@/lib/api'
import { StatusBadge } from '@/components/StatusBadge'

const STATUSES = ['', 'draft', 'pending_review', 'approved', 'scheduled', 'published', 'failed', 'rejected']
const TYPES = [
  '', 'user_story', 'urgency_offer', 'engagement_poll',
  'short_post', 'article', 'poll', 'review', 'faq', 'news',
  'responsible_gambling', 'myth_fact',
]
const LANGS = ['', 'uk', 'ru']

const TYPE_LABELS: Record<string, string> = {
  user_story: '🧑 Історія виграшу',
  urgency_offer: '⏰ Терміновий офер',
  engagement_poll: '📊 Engagement Poll',
  short_post: 'Короткий пост', article: 'Стаття', poll: 'Опитування',
  review: 'Огляд', faq: 'FAQ', news: 'Новина',
  responsible_gambling: 'Відповідальна гра', myth_fact: 'Міф/Факт',
}

export default function PostsPage() {
  const [posts, setPosts] = useState<Post[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState('')
  const [type, setType] = useState('')
  const [language, setLanguage] = useState('')
  const [page, setPage] = useState(1)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.getPosts({ status: status || undefined, type: type || undefined, language: language || undefined, page, limit: 20 })
      setPosts(res.posts)
      setTotal(res.total)
    } finally {
      setLoading(false)
    }
  }, [status, type, language, page])

  useEffect(() => { load() }, [load])

  const totalPages = Math.ceil(total / 20)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="page-title">Пости <span className="text-tile-coal/40 font-normal text-lg">({total})</span></h1>
        <Link href="/posts/new" className="btn-coal">+ Новий пост</Link>
      </div>

      {/* Filters — coal bar */}
      <div className="panel-pad flex gap-3 flex-wrap">
        <Select value={status} onChange={(v) => { setStatus(v); setPage(1) }} options={STATUSES} placeholder="Статус" />
        <Select value={type} onChange={(v) => { setType(v); setPage(1) }} options={TYPES} placeholder="Тип" labelMap={TYPE_LABELS} />
        <Select value={language} onChange={(v) => { setLanguage(v); setPage(1) }} options={LANGS} placeholder="Мова" labelMap={{ uk: '🇺🇦 UA', ru: '🇷🇺 RU' }} />
      </div>

      {loading ? (
        <div className="eyebrow animate-pulse">Завантаження…</div>
      ) : (
        <div className="panel divide-y divide-white/10">
          {posts.length === 0 && <p className="p-6 text-white/40 text-sm text-center">Нічого не знайдено</p>}
          {posts.map((post) => (
            <div key={post.id} className="p-4 flex items-start gap-4 hover:bg-white/5 transition-colors">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <StatusBadge status={post.status} />
                  <span className="text-xs text-white/40">{TYPE_LABELS[post.type] ?? post.type}</span>
                  <span className="text-xs text-white/40">{post.language === 'uk' ? '🇺🇦' : '🇷🇺'}</span>
                </div>
                <p className="text-sm font-medium text-white truncate">{post.title || post.content.slice(0, 80)}</p>
                <p className="text-xs text-white/40 mt-0.5 font-mono">{new Date(post.createdAt).toLocaleString('uk-UA')}</p>
              </div>
              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                <Link href={`/posts/${post.id}`} className="text-sm text-tile-pink hover:text-tile-teal font-medium">
                  Відкрити →
                </Link>
                <Link href={`/constructor?from=${post.id}`} className="text-xs text-white/40 hover:text-white">
                  🔁 Дублювати як шаблон
                </Link>
                <Link href={`/constructor?from=${post.id}&abGroupId=${post.abGroupId ?? post.id}&abVariant=B`} className="text-xs text-white/40 hover:text-white">
                  🧪 Створити варіант B
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

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

function Select({ value, onChange, options, placeholder, labelMap = {} }: {
  value: string; onChange: (v: string) => void; options: string[]; placeholder: string; labelMap?: Record<string, string>
}) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className="fld w-auto">
      <option value="">{placeholder}</option>
      {options.filter(Boolean).map((o) => (
        <option key={o} value={o}>{labelMap[o] ?? o}</option>
      ))}
    </select>
  )
}
