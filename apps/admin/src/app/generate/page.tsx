'use client'
import { useState } from 'react'
import Link from 'next/link'
import { api, type Post } from '@/lib/api'

const TYPES = [
  { value: 'user_story',      label: '🧑 Історія виграшу (User Story)', badge: 'Хіт' },
  { value: 'urgency_offer',   label: '⏰ Терміновий офер (Urgency)',     badge: 'FOMO' },
  { value: 'engagement_poll', label: '📊 Опитування для залучення',      badge: 'Engagement' },
  { value: 'short_post',      label: '⚡️ Короткий пост',                 badge: '' },
  { value: 'poll',            label: '🧠 Квіз / Опитування',             badge: '' },
  { value: 'myth_fact',       label: '🔍 Міф vs Факт',                   badge: '' },
  { value: 'review',          label: '⭐️ Огляд гри / казино',            badge: '' },
  { value: 'article',         label: '📰 Стаття',                        badge: '' },
  { value: 'faq',             label: '❓ FAQ',                            badge: '' },
  { value: 'news',            label: '📡 Новина',                        badge: '' },
  { value: 'responsible_gambling', label: '⚠️ Відповідальна гра',        badge: '' },
]

const TONES = [
  { value: 'hype',         label: '🔥 Хайп (максимальний ажіотаж)' },
  { value: 'engaging',     label: '😎 Залучаючий' },
  { value: 'entertaining', label: '🎉 Розважальний' },
  { value: 'neutral',      label: '😐 Нейтральний' },
  { value: 'educational',  label: '📚 Освітній' },
  { value: 'serious',      label: '🎩 Серйозний' },
]

const TYPE_TIPS: Record<string, string> = {
  user_story:      'Пост від імені реального гравця: ім\'я, місто, сума виграшу + CTA-кнопка.',
  urgency_offer:   'FOMO-пост з таймером або обмеженою кількістю бонусів. Потрібен CTA URL.',
  engagement_poll: 'Просте опитування для залучення підписників: "Встиг забрати бонус?"',
  poll:            'Квіз з правильною відповіддю — навчає і залучає.',
  myth_fact:       'Розвінчує міф, підвищує довіру аудиторії.',
}

export default function GeneratePage() {
  const [form, setForm] = useState({
    theme: '',
    contentType: 'user_story',
    language: 'uk',
    tone: 'hype',
    count: 3,
    ctaUrl: '',
    channelName: 'Гральний Клуб',
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
      const payload = {
        ...form,
        ctaUrl: form.ctaUrl || undefined,
        channelName: form.channelName || undefined,
      }
      const res = await api.generateBatch(payload)
      setResult(res.posts)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Помилка генерації')
    } finally {
      setLoading(false)
    }
  }

  const tip = TYPE_TIPS[form.contentType]

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">✨ Генерація контенту</h1>

      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">

        {/* Тип */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Тип посту</label>
          <div className="grid grid-cols-1 gap-1.5">
            {TYPES.map((t) => (
              <label key={t.value}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors ${
                  form.contentType === t.value
                    ? 'border-sky-500 bg-sky-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}>
                <input type="radio" name="contentType" value={t.value}
                  checked={form.contentType === t.value}
                  onChange={() => set('contentType', t.value)}
                  className="sr-only" />
                <span className="text-sm flex-1">{t.label}</span>
                {t.badge && (
                  <span className="text-xs font-bold text-sky-600 bg-sky-100 px-2 py-0.5 rounded-full">{t.badge}</span>
                )}
              </label>
            ))}
          </div>
          {tip && <p className="mt-2 text-xs text-slate-500 bg-slate-50 px-3 py-2 rounded-lg">{tip}</p>}
        </div>

        {/* Тема */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Тема *</label>
          <input
            value={form.theme}
            onChange={(e) => set('theme', e.target.value)}
            placeholder="Напр.: бонус для нових гравців, великий виграш у слоті, акція до вихідних..."
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* CTA URL */}
          <div className="col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">CTA URL (посилання кнопки)</label>
            <input
              type="url"
              value={form.ctaUrl}
              onChange={(e) => set('ctaUrl', e.target.value)}
              placeholder="https://t.me/your_bot?start=bonus"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          {/* Назва каналу */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Назва каналу</label>
            <input
              value={form.channelName}
              onChange={(e) => set('channelName', e.target.value)}
              placeholder="Гральний Клуб"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          {/* Мова */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Мова</label>
            <select value={form.language} onChange={(e) => set('language', e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500">
              <option value="uk">🇺🇦 Українська</option>
              <option value="ru">🇷🇺 Російська</option>
            </select>
          </div>

          {/* Тональність */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Тональність</label>
            <select value={form.tone} onChange={(e) => set('tone', e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500">
              {TONES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>

          {/* Кількість */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Кількість</label>
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
          {loading
            ? `⏳ Claude AI генерує ${form.count} постів...`
            : `✨ Згенерувати ${form.count} ${form.count === 1 ? 'пост' : 'постів'}`}
        </button>

        {error && <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
      </div>

      {result && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-700">Результат ({result.length} постів)</h2>
            <Link href="/posts?status=pending_review" className="text-sm text-sky-600 hover:text-sky-700 font-medium">
              Перейти до ревʼю →
            </Link>
          </div>
          {result.map((post, i) => (
            <div key={post.id ?? i} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
                <span className="text-xs font-medium text-slate-500">Пост {i + 1} / {result.length}</span>
                {post.id && (
                  <Link href={`/posts/${post.id}`} className="text-xs text-sky-600 hover:text-sky-700 font-medium">
                    Редагувати →
                  </Link>
                )}
              </div>
              <div className="p-4">
                {post.title && <p className="text-sm font-semibold text-slate-700 mb-2">{post.title}</p>}
                <pre className="text-sm text-slate-600 whitespace-pre-wrap font-sans leading-relaxed">
                  {post.content}
                </pre>
                {post.poll && (
                  <div className="mt-3 border border-slate-200 rounded-lg p-3 bg-slate-50">
                    <p className="text-xs font-medium text-slate-500 mb-2">📊 Опитування</p>
                    <p className="text-sm font-medium text-slate-700">{post.poll.question}</p>
                    <div className="mt-1 space-y-1">
                      {post.poll.options.map((opt: string, j: number) => (
                        <div key={j} className="text-xs text-slate-500 flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-xs">{j + 1}</span>
                          {opt}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {post.buttons && (post.buttons as { text: string; url: string }[]).map((btn, j) => (
                  <div key={j} className="mt-3 bg-blue-500 text-white text-sm font-medium px-4 py-2.5 rounded-lg text-center">
                    {btn.text}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
