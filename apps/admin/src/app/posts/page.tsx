'use client'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { api, type Post } from '@/lib/api'
import { StatusBadge } from '@/components/StatusBadge'

const STATUSES = ['', 'draft', 'pending_review', 'approved', 'scheduled', 'published', 'failed', 'rejected']
const TYPES = ['', 'short_post', 'article', 'poll', 'review', 'faq', 'news', 'responsible_gambling', 'myth_fact']
const LANGS = ['', 'uk', 'ru']

const TYPE_LABELS: Record<string, string> = {
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Пости <span className="text-slate-400 font-normal text-lg">({total})</span></h1>
        <Link href="/posts/new" className="bg-sky-600 hover:bg-sky-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
          + Новий пост
        </Link>
      </div>

      <div className="flex gap-3 flex-wrap">
        <Select value={status} onChange={(v) => { setStatus(v); setPage(1) }} options={STATUSES} placeholder="Статус" />
        <Select value={type} onChange={(v) => { setType(v); setPage(1) }} options={TYPES} placeholder="Тип" labelMap={TYPE_LABELS} />
        <Select value={language} onChange={(v) => { setLanguage(v); setPage(1) }} options={LANGS} placeholder="Мова" labelMap={{ uk: '🇺🇦 UA', ru: '🇷🇺 RU' }} />
      </div>

      {loading ? (
        <div className="text-slate-400">Завантаження...</div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
          {posts.length === 0 && <p className="p-6 text-slate-400 text-sm text-center">Нічого не знайдено</p>}
          {posts.map((post) => (
            <div key={post.id} className="p-4 flex items-start gap-4 hover:bg-slate-50 transition-colors">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <StatusBadge status={post.status} />
                  <span className="text-xs text-slate-400">{TYPE_LABELS[post.type] ?? post.type}</span>
                  <span className="text-xs text-slate-400">{post.language === 'uk' ? '🇺🇦' : '🇷🇺'}</span>
                </div>
                <p className="text-sm font-medium text-slate-800 truncate">{post.title || post.content.slice(0, 80)}</p>
                <p className="text-xs text-slate-400 mt-0.5">{new Date(post.createdAt).toLocaleString('uk-UA')}</p>
              </div>
              <Link
                href={`/posts/${post.id}`}
                className="flex-shrink-0 text-sm text-sky-600 hover:text-sky-700 font-medium"
              >
                Відкрити →
              </Link>
            </div>
          ))}
        </div>
      )}

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

function Select({ value, onChange, options, placeholder, labelMap = {} }: {
  value: string; onChange: (v: string) => void; options: string[]; placeholder: string; labelMap?: Record<string, string>
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
    >
      <option value="">{placeholder}</option>
      {options.filter(Boolean).map((o) => (
        <option key={o} value={o}>{labelMap[o] ?? o}</option>
      ))}
    </select>
  )
}
