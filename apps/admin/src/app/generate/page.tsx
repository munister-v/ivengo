'use client'
import { useState } from 'react'
import Link from 'next/link'
import { api, type Post } from '@/lib/api'

const TYPES = [
  { value: 'short_post', label: 'Короткий пост' },
  { value: 'article', label: 'Стаття' },
  { value: 'poll', label: 'Опитування' },
  { value: 'review', label: 'Огляд' },
  { value: 'faq', label: 'FAQ' },
  { value: 'news', label: 'Новина' },
  { value: 'responsible_gambling', label: 'Відповідальна гра' },
  { value: 'myth_fact', label: 'Міф/Факт' },
]

const TONES = [
  { value: 'neutral', label: 'Нейтральний' },
  { value: 'engaging', label: 'Залучаючий' },
  { value: 'educational', label: 'Освітній' },
  { value: 'entertaining', label: 'Розважальний' },
  { value: 'serious', label: 'Серйозний' },
]

export default function GeneratePage() {
  const [form, setForm] = useState({
    theme: '',
    contentType: 'short_post',
    language: 'uk',
    tone: 'neutral',
    count: 3,
  })
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<Post[] | null>(null)
  const [error, setError] = useState('')

  function set(key: string, value: string | number) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function generate() {
    if (!form.theme) return
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const res = await api.generateBatch(form)
      setResult(res.posts)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Помилка генерації')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">✨ Генерація контенту</h1>

      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Тема *</label>
          <input
            value={form.theme}
            onChange={(e) => set('theme', e.target.value)}
            placeholder="Наприклад: Огляд популярних слотів, Стратегії в блекджеку..."
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Тип контенту</label>
            <select value={form.contentType} onChange={(e) => set('contentType', e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500">
              {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Мова</label>
            <select value={form.language} onChange={(e) => set('language', e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500">
              <option value="uk">🇺🇦 Українська</option>
              <option value="ru">🇷🇺 Російська</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Тональність</label>
            <select value={form.tone} onChange={(e) => set('tone', e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500">
              {TONES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Кількість постів</label>
            <input type="number" min={1} max={10} value={form.count}
              onChange={(e) => set('count', Number(e.target.value))}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
          </div>
        </div>

        <button
          onClick={generate}
          disabled={loading || !form.theme}
          className="w-full bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white font-medium py-3 rounded-xl text-sm transition-colors"
        >
          {loading ? `Генерація ${form.count} постів через Claude AI...` : `✨ Згенерувати ${form.count} ${form.count === 1 ? 'пост' : 'постів'}`}
        </button>

        {error && <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
      </div>

      {result && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-700">Результат ({result.length} постів)</h2>
            <Link href="/posts?status=pending_review" className="text-sm text-sky-600 hover:text-sky-700">
              Перейти до перегляду →
            </Link>
          </div>
          {result.map((post, i) => (
            <div key={post.id ?? i} className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-slate-500">{i + 1} / {result.length}</span>
                {post.id && (
                  <Link href={`/posts/${post.id}`} className="text-xs text-sky-600 hover:text-sky-700 font-medium">
                    Відкрити →
                  </Link>
                )}
              </div>
              {post.title && <p className="text-sm font-semibold text-slate-700 mb-2">{post.title}</p>}
              <pre className="text-sm text-slate-600 whitespace-pre-wrap font-sans leading-relaxed">
                {post.content}
              </pre>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
