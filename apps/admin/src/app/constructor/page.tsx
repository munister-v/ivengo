'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { TEMPLATES, TEMPLATE_GROUPS } from './templates'

const TYPES = [
  { value: 'short_post', label: '⚡️ Короткий пост' },
  { value: 'article', label: '📰 Стаття' },
  { value: 'review', label: '⭐️ Огляд' },
  { value: 'faq', label: '❓ FAQ' },
  { value: 'news', label: '📡 Новина' },
  { value: 'responsible_gambling', label: '⚠️ Відповідальна гра' },
  { value: 'myth_fact', label: '🔍 Міф vs Факт' },
  { value: 'poll', label: '🧠 Квіз / Опитування' },
  { value: 'engagement_poll', label: '📊 Опитування для залучення' },
]

interface ButtonRow { text: string; url: string }

export default function ConstructorPage() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [type, setType] = useState('short_post')
  const [language, setLanguage] = useState('uk')
  const [imageUrl, setImageUrl] = useState('')
  const [ctaUrl, setCtaUrl] = useState('')
  const [buttons, setButtons] = useState<ButtonRow[]>([])
  const [pollQuestion, setPollQuestion] = useState('')
  const [pollOptions, setPollOptions] = useState(['', ''])
  const [pollAnonymous, setPollAnonymous] = useState(true)
  const [scheduledAt, setScheduledAt] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  const isPollType = type === 'poll' || type === 'engagement_poll'

  function notify(text: string, t: 'success' | 'error' = 'success') {
    setMessage({ text, type: t })
    setTimeout(() => setMessage(null), 4000)
  }

  function applyTemplate(id: string) {
    const t = TEMPLATES.find((tt) => tt.id === id)
    if (!t) return
    setTitle(t.title)
    setContent(t.content)
    setType(t.type)
    setButtons(t.buttons ? t.buttons.map((b) => ({ ...b })) : [])
    if (t.poll) {
      setPollQuestion(t.poll.question)
      setPollOptions([...t.poll.options])
      setPollAnonymous(t.poll.isAnonymous ?? true)
    } else {
      setPollQuestion('')
      setPollOptions(['', ''])
    }
    notify(`Застосовано шаблон: ${t.label}`)
  }

  function addButton() { setButtons((b) => [...b, { text: '', url: '' }]) }
  function updateButton(i: number, key: keyof ButtonRow, value: string) {
    setButtons((b) => b.map((row, idx) => (idx === i ? { ...row, [key]: value } : row)))
  }
  function removeButton(i: number) { setButtons((b) => b.filter((_, idx) => idx !== i)) }

  function addOption() { setPollOptions((o) => [...o, '']) }
  function updateOption(i: number, value: string) {
    setPollOptions((o) => o.map((opt, idx) => (idx === i ? value : opt)))
  }
  function removeOption(i: number) { setPollOptions((o) => o.filter((_, idx) => idx !== i)) }

  async function save(asScheduled: boolean) {
    if (!content.trim()) { notify('Введіть текст посту', 'error'); return }
    if (isPollType && (!pollQuestion.trim() || pollOptions.filter((o) => o.trim()).length < 2)) {
      notify('Заповніть питання та мінімум 2 варіанти відповіді', 'error')
      return
    }
    setSaving(true)
    try {
      const validButtons = buttons.filter((b) => b.text.trim() && b.url.trim())
      const payload: Record<string, unknown> = {
        title: title || undefined,
        content,
        type,
        language,
        imageUrl: imageUrl || undefined,
        ctaUrl: ctaUrl || undefined,
        buttons: validButtons.length ? validButtons : undefined,
      }
      if (isPollType) {
        payload.poll = {
          question: pollQuestion,
          options: pollOptions.filter((o) => o.trim()),
          isAnonymous: pollAnonymous,
        }
      }
      if (asScheduled && scheduledAt) {
        payload.status = 'scheduled'
        payload.scheduledAt = new Date(scheduledAt).toISOString()
      } else {
        payload.status = 'pending_review'
      }
      const post = await api.createPost(payload)
      notify('Пост створено')
      router.push(`/posts/${post.id}`)
    } catch (e: unknown) {
      notify(e instanceof Error ? e.message : 'Помилка створення', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">🛠️ Конструктор посту</h1>
      <p className="text-sm text-slate-500">Зберіть пост вручну: текст, зображення, inline-кнопки, опитування — і поставте у чергу або на ревʼю.</p>

      {message && (
        <div className={`px-4 py-3 rounded-lg text-sm font-medium ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {message.text}
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
        <label className="block text-sm font-medium text-slate-700">📋 Готові шаблони ({TEMPLATES.length})</label>
        <p className="text-xs text-slate-400 -mt-2">Оберіть шаблон — поля заповняться автоматично, далі підставте актуальні деталі.</p>
        {TEMPLATE_GROUPS.map((group) => (
          <div key={group}>
            <p className="text-xs font-semibold text-slate-500 mb-1.5">{group}</p>
            <div className="flex flex-wrap gap-1.5">
              {TEMPLATES.filter((t) => t.group === group).map((t) => (
                <button key={t.id} type="button" onClick={() => applyTemplate(t.id)}
                  className="text-xs border border-slate-200 hover:border-sky-400 hover:bg-sky-50 text-slate-600 hover:text-sky-700 px-2.5 py-1.5 rounded-lg transition-colors">
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Тип посту</label>
          <select value={type} onChange={(e) => setType(e.target.value)}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm">
            {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-700 mb-1">Заголовок</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              placeholder="Необов'язково" />
          </div>
          <div className="w-32">
            <label className="block text-sm font-medium text-slate-700 mb-1">Мова</label>
            <select value={language} onChange={(e) => setLanguage(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm">
              <option value="uk">🇺🇦 UA</option>
              <option value="ru">🇷🇺 RU</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Текст посту (Telegram Markdown)</label>
          <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={8}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono resize-y"
            placeholder="*Жирний*, _курсив_, емодзі — все працює" />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Зображення (URL)</label>
          <input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
            placeholder="https://..." />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">CTA посилання (за замовчуванням для кнопок)</label>
          <input value={ctaUrl} onChange={(e) => setCtaUrl(e.target.value)}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
            placeholder="https://..." />
        </div>

        {/* Buttons constructor */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-slate-700">Inline-кнопки</label>
            <button type="button" onClick={addButton}
              className="text-xs text-sky-600 hover:text-sky-700 font-medium">+ Додати кнопку</button>
          </div>
          <div className="space-y-2">
            {buttons.map((b, i) => (
              <div key={i} className="flex gap-2 items-center">
                <input value={b.text} onChange={(e) => updateButton(i, 'text', e.target.value)}
                  placeholder="Текст кнопки"
                  className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm" />
                <input value={b.url} onChange={(e) => updateButton(i, 'url', e.target.value)}
                  placeholder="https://..."
                  className="flex-[2] border border-slate-200 rounded-lg px-3 py-2 text-sm" />
                <button type="button" onClick={() => removeButton(i)}
                  className="text-slate-400 hover:text-red-500 px-2">✕</button>
              </div>
            ))}
            {buttons.length === 0 && <p className="text-xs text-slate-400">Кнопок ще немає</p>}
          </div>
        </div>

        {/* Poll constructor */}
        {isPollType && (
          <div className="border border-slate-200 rounded-lg p-4 bg-slate-50 space-y-3">
            <p className="text-sm font-medium text-slate-700">📊 Опитування</p>
            <input value={pollQuestion} onChange={(e) => setPollQuestion(e.target.value)}
              placeholder="Питання"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white" />
            <div className="space-y-2">
              {pollOptions.map((opt, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <span className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs">{i + 1}</span>
                  <input value={opt} onChange={(e) => updateOption(i, e.target.value)}
                    placeholder={`Варіант ${i + 1}`}
                    className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white" />
                  {pollOptions.length > 2 && (
                    <button type="button" onClick={() => removeOption(i)}
                      className="text-slate-400 hover:text-red-500 px-2">✕</button>
                  )}
                </div>
              ))}
            </div>
            {pollOptions.length < 10 && (
              <button type="button" onClick={addOption} className="text-xs text-sky-600 hover:text-sky-700 font-medium">+ Додати варіант</button>
            )}
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" checked={pollAnonymous} onChange={(e) => setPollAnonymous(e.target.checked)} />
              Анонімне опитування
            </label>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Запланувати на (необов&apos;язково)</label>
          <input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm" />
        </div>

        <div className="flex gap-3 pt-2">
          <button onClick={() => save(false)} disabled={saving}
            className="bg-slate-700 hover:bg-slate-800 disabled:opacity-50 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors">
            {saving ? 'Збереження...' : '💾 На ревʼю (чернетка)'}
          </button>
          <button onClick={() => save(true)} disabled={saving || !scheduledAt}
            className="bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors">
            {saving ? 'Збереження...' : '⏰ Запланувати публікацію'}
          </button>
        </div>
      </div>
    </div>
  )
}
