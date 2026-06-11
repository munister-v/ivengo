'use client'
import { useState } from 'react'
import Link from 'next/link'
import { api, type Post } from '@/lib/api'
import { ChannelPicker } from '@/components/ChannelPicker'

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
  const [channelIds, setChannelIds] = useState<string[]>([])
  const [autoSchedule, setAutoSchedule] = useState(false)
  const [startAt, setStartAt] = useState('')
  const [intervalHours, setIntervalHours] = useState(4)
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
        channelIds: channelIds.length ? channelIds : undefined,
        autoSchedule: autoSchedule && startAt
          ? { startAt: new Date(startAt).toISOString(), intervalHours }
          : undefined,
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
    <div className="max-w-2xl space-y-4">
      <h1 className="page-title">✨ Генерація контенту</h1>

      <div className="panel-pad space-y-4">
        {/* Тип */}
        <div>
          <label className="lbl">Тип посту</label>
          <div className="grid grid-cols-1 gap-1.5">
            {TYPES.map((t) => (
              <label key={t.value}
                className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors ${
                  form.contentType === t.value ? 'bg-tile-pink text-tile-coal' : 'bg-white/5 text-white/80 hover:bg-white/10'
                }`}>
                <input type="radio" name="contentType" value={t.value} checked={form.contentType === t.value} onChange={() => set('contentType', t.value)} className="sr-only" />
                <span className="text-sm flex-1">{t.label}</span>
                {t.badge && (
                  <span className={`text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 ${form.contentType === t.value ? 'bg-tile-coal text-tile-pink' : 'bg-tile-pink text-tile-coal'}`}>{t.badge}</span>
                )}
              </label>
            ))}
          </div>
          {tip && <p className="mt-2 text-xs text-white/60 bg-white/5 px-3 py-2">{tip}</p>}
        </div>

        {/* Тема */}
        <div>
          <label className="lbl">Тема *</label>
          <input value={form.theme} onChange={(e) => set('theme', e.target.value)}
            placeholder="Напр.: бонус для нових гравців, великий виграш у слоті, акція до вихідних..." className="fld" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="lbl">CTA URL (посилання кнопки)</label>
            <input type="url" value={form.ctaUrl} onChange={(e) => set('ctaUrl', e.target.value)} placeholder="https://t.me/your_bot?start=bonus" className="fld" />
          </div>
          <div>
            <label className="lbl">Назва каналу</label>
            <input value={form.channelName} onChange={(e) => set('channelName', e.target.value)} placeholder="Гральний Клуб" className="fld" />
          </div>
          <div>
            <label className="lbl">Мова</label>
            <select value={form.language} onChange={(e) => set('language', e.target.value)} className="fld">
              <option value="uk">🇺🇦 Українська</option>
              <option value="ru">🇷🇺 Російська</option>
            </select>
          </div>
          <div>
            <label className="lbl">Тональність</label>
            <select value={form.tone} onChange={(e) => set('tone', e.target.value)} className="fld">
              {TONES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="lbl">Кількість</label>
            <input type="number" min={1} max={10} value={form.count} onChange={(e) => set('count', Number(e.target.value))} className="fld" />
          </div>
        </div>

        <ChannelPicker value={channelIds} onChange={setChannelIds} label="Пабліки для цієї генерації" />

        {/* Авто-розклад */}
        <div className="bg-white/5 p-4 space-y-3">
          <label className="flex items-center gap-2 text-sm font-medium text-white">
            <input type="checkbox" checked={autoSchedule} onChange={(e) => setAutoSchedule(e.target.checked)} className="accent-tile-pink" />
            ⏰ Автоматично поставити в чергу публікації
          </label>
          <p className="text-xs text-white/50 -mt-1">Пости одразу отримають статус «заплановано» з рівномірним інтервалом — без ручного ревʼю кожного.</p>
          {autoSchedule && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="lbl">Початок публікації</label>
                <input type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} className="fld" />
              </div>
              <div>
                <label className="lbl">Інтервал (год)</label>
                <input type="number" min={0.25} max={168} step={0.5} value={intervalHours} onChange={(e) => setIntervalHours(Number(e.target.value))} className="fld" />
              </div>
            </div>
          )}
        </div>

        <button onClick={generate} disabled={loading || !form.theme} className="btn w-full !py-3">
          {loading ? `⏳ AI генерує ${form.count} ${form.count === 1 ? 'пост' : 'постів'}...` : `✨ Згенерувати ${form.count} ${form.count === 1 ? 'пост' : 'постів'}`}
        </button>

        {error && <p className="text-sm text-white bg-tile-rose px-3 py-2">{error}</p>}
      </div>

      {result && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="page-title text-lg">Результат ({result.length} постів)</h2>
            <Link href="/posts?status=pending_review" className="text-sm text-tile-coal hover:text-tile-blue font-bold">Перейти до ревʼю →</Link>
          </div>
          {result.map((post, i) => (
            <div key={post.id ?? i} className="panel overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2 bg-white/5">
                <span className="panel-label">Пост {i + 1} / {result.length}</span>
                {post.id && <Link href={`/posts/${post.id}`} className="text-xs text-tile-pink hover:text-tile-teal font-medium">Редагувати →</Link>}
              </div>
              <div className="p-4">
                {post.title && <p className="text-sm font-semibold text-white mb-2">{post.title}</p>}
                <pre className="text-sm text-white/80 whitespace-pre-wrap font-sans leading-relaxed">{post.content}</pre>
                {post.poll && (
                  <div className="mt-3 bg-white/5 p-3">
                    <p className="panel-label mb-2">📊 Опитування</p>
                    <p className="text-sm font-medium text-white">{post.poll.question}</p>
                    <div className="mt-1 space-y-1">
                      {post.poll.options.map((opt: string, j: number) => (
                        <div key={j} className="text-xs text-white/60 flex items-center gap-2">
                          <span className="w-5 h-5 bg-white/10 flex items-center justify-center text-xs">{j + 1}</span>
                          {opt}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {post.buttons && (post.buttons as { text: string; url: string }[]).map((btn, j) => (
                  <div key={j} className="mt-3 bg-tile-blue text-white text-sm font-medium px-4 py-2.5 text-center">{btn.text}</div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
