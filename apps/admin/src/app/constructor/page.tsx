'use client'
import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { api, type Post, type MediaAsset } from '@/lib/api'
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
  return (
    <Suspense fallback={<div className="eyebrow animate-pulse">Завантаження…</div>}>
      <ConstructorForm />
    </Suspense>
  )
}

function ConstructorForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [similar, setSimilar] = useState<Post[]>([])
  const [loadingFrom, setLoadingFrom] = useState(false)
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
  const [showMediaPicker, setShowMediaPicker] = useState(false)
  const [mediaAssets, setMediaAssets] = useState<MediaAsset[]>([])
  const [abVariant, setAbVariant] = useState('')
  const [abGroupId, setAbGroupId] = useState('')
  const [sourcePostId, setSourcePostId] = useState('')

  useEffect(() => {
    api.getMedia().then(setMediaAssets).catch(() => setMediaAssets([]))
  }, [])

  const isPollType = type === 'poll' || type === 'engagement_poll'

  function notify(text: string, t: 'success' | 'error' = 'success') {
    setMessage({ text, type: t })
    setTimeout(() => setMessage(null), 4000)
  }

  function applyPost(p: Post) {
    setTitle(p.title ?? '')
    setContent(p.content)
    setType(p.type)
    setLanguage(p.language)
    setImageUrl(p.imageUrl ?? '')
    setCtaUrl(p.ctaUrl ?? '')
    setButtons(p.buttons ? p.buttons.map((b) => ({ ...b })) : [])
    if (p.poll) {
      setPollQuestion(p.poll.question)
      setPollOptions([...p.poll.options])
      setPollAnonymous(p.poll.isAnonymous ?? true)
    } else {
      setPollQuestion('')
      setPollOptions(['', ''])
    }
  }

  useEffect(() => {
    const fromId = searchParams.get('from')
    const qAbGroupId = searchParams.get('abGroupId')
    const qAbVariant = searchParams.get('abVariant')
    if (qAbGroupId) setAbGroupId(qAbGroupId)
    if (qAbVariant) setAbVariant(qAbVariant)
    if (fromId) setSourcePostId(fromId)
    if (!fromId) return
    setLoadingFrom(true)
    api.getPost(fromId)
      .then((p) => {
        applyPost(p)
        notify(`Завантажено як основу: "${p.title || p.content.slice(0, 40)}…"`)
      })
      .catch((e) => notify(e instanceof Error ? e.message : 'Не вдалось завантажити пост', 'error'))
      .finally(() => setLoadingFrom(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    api.getPosts({ type, status: 'published', limit: 5 })
      .then((res) => setSimilar(res.posts))
      .catch(() => setSimilar([]))
  }, [type])

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
        abVariant: abVariant || undefined,
        abGroupId: abVariant ? (abGroupId || undefined) : undefined,
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
      if (abVariant && abGroupId && sourcePostId && sourcePostId !== post.id) {
        try {
          const source = await api.getPost(sourcePostId)
          if (!source.abGroupId) {
            await api.updatePost(sourcePostId, { abGroupId, abVariant: source.abVariant || 'A' })
          }
        } catch {
          // non-critical — ignore
        }
      }
      notify('Пост створено')
      router.push(`/posts/${post.id}`)
    } catch (e: unknown) {
      notify(e instanceof Error ? e.message : 'Помилка створення', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-2xl space-y-4">
      <div>
        <h1 className="page-title">🛠️ Конструктор посту</h1>
        <p className="page-sub mt-1">Зберіть пост вручну: текст, зображення, inline-кнопки, опитування — і поставте у чергу або на ревʼю.</p>
      </div>

      {message && (
        <div className={`px-4 py-3 text-sm font-medium ${message.type === 'success' ? 'bg-tile-teal text-tile-coal' : 'bg-tile-rose text-white'}`}>
          {message.text}
        </div>
      )}

      {loadingFrom && <div className="px-4 py-3 text-sm bg-tile-blue text-white">Завантаження посту-основи...</div>}

      {similar.length > 0 && (
        <div className="panel-pad space-y-3">
          <label className="panel-label">📈 Попередні опубліковані пости цього типу</label>
          <p className="text-xs text-white/40 -mt-2">Подивіться, що вже публікувалось — натисніть, щоб використати як основу.</p>
          <div className="space-y-2">
            {similar.map((p) => (
              <button key={p.id} type="button" onClick={() => { applyPost(p); notify('Завантажено як основу') }}
                className="w-full text-left bg-white/5 hover:bg-white/10 px-3 py-2 transition-colors">
                <p className="text-sm font-medium text-white truncate">{p.title || p.content.slice(0, 60)}</p>
                <p className="text-xs text-white/40 mt-0.5">
                  {p.publishedAt ? new Date(p.publishedAt).toLocaleDateString('uk-UA') : ''}
                  {p.buttons?.length ? ` · 🔘 ${p.buttons.length} кнопок` : ''}
                  {p.poll ? ' · 📊 опитування' : ''}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="panel-pad space-y-3">
        <label className="panel-label">📋 Готові шаблони ({TEMPLATES.length})</label>
        <p className="text-xs text-white/40 -mt-2">Оберіть шаблон — поля заповняться автоматично, далі підставте деталі.</p>
        {TEMPLATE_GROUPS.map((group) => (
          <div key={group}>
            <p className="text-[10px] font-mono uppercase tracking-widest text-tile-pink mb-1.5">{group}</p>
            <div className="flex flex-wrap gap-1.5">
              {TEMPLATES.filter((t) => t.group === group).map((t) => (
                <button key={t.id} type="button" onClick={() => applyTemplate(t.id)}
                  className="text-xs bg-white/5 hover:bg-tile-pink hover:text-tile-coal text-white/70 px-2.5 py-1.5 transition-colors">
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="panel-pad space-y-4">
        <div>
          <label className="lbl">Тип посту</label>
          <select value={type} onChange={(e) => setType(e.target.value)} className="fld">
            {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <label className="lbl">Заголовок</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className="fld" placeholder="Необов'язково" />
          </div>
          <div className="w-32">
            <label className="lbl">Мова</label>
            <select value={language} onChange={(e) => setLanguage(e.target.value)} className="fld">
              <option value="uk">🇺🇦 UA</option>
              <option value="ru">🇷🇺 RU</option>
            </select>
          </div>
        </div>

        <div>
          <label className="lbl">Текст посту (Telegram Markdown)</label>
          <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={8}
            className="fld font-mono resize-y" placeholder="*Жирний*, _курсив_, емодзі — все працює" />
        </div>

        <div>
          <label className="lbl">Зображення (URL)</label>
          <div className="flex gap-2">
            <input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} className="fld flex-1" placeholder="https://..." />
            <button type="button" onClick={() => setShowMediaPicker(true)} className="btn-line whitespace-nowrap">🖼️ З бібліотеки</button>
          </div>
          {imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt="" className="mt-2 h-24 object-cover" />
          )}
        </div>

        {showMediaPicker && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setShowMediaPicker(false)}>
            <div className="panel-pad max-w-lg w-full max-h-[70vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="panel-label">Обрати з бібліотеки медіа</h3>
                <button onClick={() => setShowMediaPicker(false)} className="text-white/40 hover:text-white">✕</button>
              </div>
              {mediaAssets.length === 0 ? (
                <p className="text-sm text-white/40">Бібліотека порожня. Додайте зображення на сторінці «Медіа».</p>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {mediaAssets.map((m) => (
                    <button key={m.id} type="button" onClick={() => { setImageUrl(m.url); setShowMediaPicker(false) }}
                      className="overflow-hidden hover:ring-2 hover:ring-tile-pink">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={m.url} alt={m.name ?? ''} className="w-full h-20 object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <div>
          <label className="lbl">CTA посилання (за замовчуванням для кнопок)</label>
          <input value={ctaUrl} onChange={(e) => setCtaUrl(e.target.value)} className="fld" placeholder="https://..." />
        </div>

        {/* Buttons constructor */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="lbl !mb-0">Inline-кнопки</label>
            <button type="button" onClick={addButton} className="text-xs text-tile-pink hover:text-tile-teal font-medium">+ Додати кнопку</button>
          </div>
          <div className="space-y-2">
            {buttons.map((b, i) => (
              <div key={i} className="flex gap-2 items-center">
                <input value={b.text} onChange={(e) => updateButton(i, 'text', e.target.value)} placeholder="Текст кнопки" className="fld flex-1" />
                <input value={b.url} onChange={(e) => updateButton(i, 'url', e.target.value)} placeholder="https://..." className="fld flex-[2]" />
                <button type="button" onClick={() => removeButton(i)} className="text-white/40 hover:text-tile-rose px-2">✕</button>
              </div>
            ))}
            {buttons.length === 0 && <p className="text-xs text-white/40">Кнопок ще немає</p>}
          </div>
        </div>

        {/* Poll constructor */}
        {isPollType && (
          <div className="bg-white/5 p-4 space-y-3">
            <p className="panel-label">📊 Опитування</p>
            <input value={pollQuestion} onChange={(e) => setPollQuestion(e.target.value)} placeholder="Питання" className="fld" />
            <div className="space-y-2">
              {pollOptions.map((opt, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <span className="w-6 h-6 bg-white/10 flex items-center justify-center text-xs text-white/70">{i + 1}</span>
                  <input value={opt} onChange={(e) => updateOption(i, e.target.value)} placeholder={`Варіант ${i + 1}`} className="fld flex-1" />
                  {pollOptions.length > 2 && (
                    <button type="button" onClick={() => removeOption(i)} className="text-white/40 hover:text-tile-rose px-2">✕</button>
                  )}
                </div>
              ))}
            </div>
            {pollOptions.length < 10 && (
              <button type="button" onClick={addOption} className="text-xs text-tile-pink hover:text-tile-teal font-medium">+ Додати варіант</button>
            )}
            <label className="flex items-center gap-2 text-sm text-white/70">
              <input type="checkbox" checked={pollAnonymous} onChange={(e) => setPollAnonymous(e.target.checked)} className="accent-tile-pink" />
              Анонімне опитування
            </label>
          </div>
        )}

        <div>
          <label className="lbl">Запланувати на (необов&apos;язково)</label>
          <input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} className="fld w-auto" />
        </div>

        {/* A/B testing */}
        <div className="bg-white/5 p-4 space-y-3">
          <p className="panel-label">🧪 A/B тест (необов&apos;язково)</p>
          <p className="text-xs text-white/50 -mt-1">Позначте пост як варіант A або B, щоб порівняти результати на сторінці «A/B Тести».</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="lbl">Варіант</label>
              <select value={abVariant} onChange={(e) => setAbVariant(e.target.value)} className="fld">
                <option value="">— Не використовувати —</option>
                <option value="A">A</option>
                <option value="B">B</option>
              </select>
            </div>
            {abVariant && (
              <div>
                <label className="lbl">ID групи (для пари)</label>
                <input value={abGroupId} onChange={(e) => setAbGroupId(e.target.value)} placeholder="пусто = нова група" className="fld font-mono" />
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-3 pt-2 flex-wrap">
          <button onClick={() => save(false)} disabled={saving} className="btn-line">
            {saving ? 'Збереження...' : '💾 На ревʼю (чернетка)'}
          </button>
          <button onClick={() => save(true)} disabled={saving || !scheduledAt} className="btn">
            {saving ? 'Збереження...' : '⏰ Запланувати публікацію'}
          </button>
        </div>
      </div>
    </div>
  )
}
