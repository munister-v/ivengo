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
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<string[]>([])
  const [bulkBusy, setBulkBusy] = useState(false)
  const [notice, setNotice] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 300)
    return () => clearTimeout(timer)
  }, [query])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.getPosts({
        status: status || undefined,
        type: type || undefined,
        language: language || undefined,
        q: debouncedQuery || undefined,
        page,
        limit: 20,
      })
      setPosts(res.posts)
      setTotal(res.total)
      setSelected((current) => current.filter((id) => res.posts.some((post) => post.id === id)))
    } finally {
      setLoading(false)
    }
  }, [status, type, language, debouncedQuery, page])

  useEffect(() => { load() }, [load])

  const totalPages = Math.ceil(total / 20)
  const selectablePosts = posts.filter((post) => post.status !== 'published')
  const allPageSelected = selectablePosts.length > 0 && selectablePosts.every((post) => selected.includes(post.id))

  function toggleSelected(id: string) {
    setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])
  }

  function togglePage() {
    const ids = selectablePosts.map((post) => post.id)
    setSelected(allPageSelected ? selected.filter((id) => !ids.includes(id)) : Array.from(new Set([...selected, ...ids])))
  }

  async function bulkStatus(nextStatus: 'draft' | 'pending_review' | 'rejected') {
    if (selected.length === 0) return
    setBulkBusy(true)
    setNotice('')
    try {
      const result = await api.bulkUpdatePostStatus(selected, nextStatus)
      setNotice(`Оновлено матеріалів: ${result.updated}`)
      setSelected([])
      await load()
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Не вдалося оновити матеріали')
    } finally {
      setBulkBusy(false)
    }
  }

  return (
    <div className="space-y-7">
      <header className="grid gap-5 border-b border-tile-coal/30 pb-7 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <p className="eyebrow mb-3">Editorial archive · {total} materials</p>
          <h1 className="page-title">Пости</h1>
          <p className="page-sub mt-3 max-w-xl">Знайдіть, перевірте або використайте попередній матеріал як основу нового.</p>
        </div>
        <Link href="/constructor" className="btn min-h-12 inline-flex items-center">Створити пост →</Link>
      </header>

      <div className="grid gap-3 border border-tile-coal/35 bg-[#fffdf9] p-4 lg:grid-cols-[1fr_auto_auto_auto]">
        <label className="relative">
          <span className="sr-only">Пошук постів</span>
          <input
            value={query}
            onChange={(e) => { setQuery(e.target.value); setPage(1) }}
            className="fld !border-tile-coal/25 !py-2"
            placeholder="Пошук за заголовком або текстом…"
          />
          {query && (
            <button type="button" onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-xs text-tile-coal/45" aria-label="Очистити пошук">
              Clear
            </button>
          )}
        </label>
        <Select value={status} onChange={(v) => { setStatus(v); setPage(1) }} options={STATUSES} placeholder="Статус" />
        <Select value={type} onChange={(v) => { setType(v); setPage(1) }} options={TYPES} placeholder="Тип" labelMap={TYPE_LABELS} />
        <Select value={language} onChange={(v) => { setLanguage(v); setPage(1) }} options={LANGS} placeholder="Мова" labelMap={{ uk: 'UA', ru: 'RU' }} />
      </div>

      {notice && (
        <div role="status" aria-live="polite" className="border border-tile-coal/30 bg-tile-amber px-4 py-3 text-sm">
          {notice}
        </div>
      )}

      <div className={`sticky top-20 z-20 flex flex-wrap items-center gap-2 border px-3 py-3 backdrop-blur transition-colors ${
        selected.length ? 'border-tile-coal bg-tile-coal/95 text-tile-amber shadow-[0_12px_32px_rgba(80,26,44,0.18)]' : 'border-tile-coal/25 bg-tile-amber/90 text-tile-coal'
      }`}>
        <label className="flex min-h-10 cursor-pointer items-center gap-3 px-2 font-mono text-[10px] uppercase tracking-[0.14em]">
          <input
            type="checkbox"
            checked={allPageSelected}
            onChange={togglePage}
            disabled={selectablePosts.length === 0}
            className="h-4 w-4 accent-tile-pink"
          />
          {selected.length ? `Обрано ${selected.length}` : 'Обрати сторінку'}
        </label>
        <span className="hidden h-6 w-px bg-current opacity-20 sm:block" />
        <button type="button" onClick={() => bulkStatus('pending_review')} disabled={!selected.length || bulkBusy} className="btn-ghost !text-current disabled:opacity-30">
          На ревʼю
        </button>
        <button type="button" onClick={() => bulkStatus('draft')} disabled={!selected.length || bulkBusy} className="btn-ghost !text-current disabled:opacity-30">
          У чернетки
        </button>
        <button type="button" onClick={() => bulkStatus('rejected')} disabled={!selected.length || bulkBusy} className="btn-ghost !text-current disabled:opacity-30">
          Відхилити
        </button>
        {selected.length > 0 && (
          <button type="button" onClick={() => setSelected([])} disabled={bulkBusy} className="ml-auto btn-ghost !text-current">
            Скасувати
          </button>
        )}
      </div>

      {loading ? (
        <div className="eyebrow animate-pulse">Завантаження…</div>
      ) : (
        <div className="border-l border-t border-tile-coal/30 bg-[#fffdf9]">
          {posts.length === 0 && <p className="border-b border-r border-tile-coal/30 p-10 text-center italic text-tile-coal/45">Нічого не знайдено</p>}
          {posts.map((post) => (
            <article key={post.id} className={`group grid gap-5 border-b border-r border-tile-coal/30 p-5 transition-colors lg:grid-cols-[auto_1fr_auto] lg:items-center ${
              selected.includes(post.id) ? 'bg-tile-pink/25' : 'hover:bg-tile-amber'
            }`}>
              <label className={`flex min-h-11 min-w-11 items-center justify-center ${post.status === 'published' ? 'opacity-20' : 'cursor-pointer'}`}>
                <input
                  type="checkbox"
                  checked={selected.includes(post.id)}
                  onChange={() => toggleSelected(post.id)}
                  disabled={post.status === 'published'}
                  aria-label={`Обрати ${post.title || post.content.slice(0, 40)}`}
                  className="h-4 w-4 accent-tile-coal"
                />
              </label>
              <div className="flex-1 min-w-0">
                <div className="mb-3 flex items-center gap-2 flex-wrap">
                  <StatusBadge status={post.status} />
                  <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-tile-coal/45">{TYPE_LABELS[post.type] ?? post.type}</span>
                  <span className="font-mono text-[9px] uppercase tracking-wider text-tile-coal/45">{post.language}</span>
                </div>
                <h2 className="text-xl leading-snug">{post.title || post.content.slice(0, 100)}</h2>
                <p className="mt-2 line-clamp-2 max-w-3xl text-sm leading-relaxed text-tile-coal/55">{post.content}</p>
                <p className="mt-3 font-mono text-[9px] uppercase tracking-wider text-tile-coal/40">{new Date(post.createdAt).toLocaleString('uk-UA')}</p>
              </div>
              <div className="flex flex-wrap gap-2 lg:w-44 lg:flex-col">
                <Link href={`/posts/${post.id}`} className="btn-coal text-center">
                  Відкрити
                </Link>
                <Link href={`/constructor?from=${post.id}`} className="btn-ghost text-center">
                  Дублювати
                </Link>
                <Link href={`/constructor?from=${post.id}&abGroupId=${post.abGroupId ?? post.id}&abVariant=B`} className="btn-ghost text-center">
                  Варіант B
                </Link>
              </div>
            </article>
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
