'use client'
import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { api, type Post, type MediaAsset } from '@/lib/api'
import { ChannelPicker } from '@/components/ChannelPicker'
import { ImageGenerator } from '@/components/ImageGenerator'
import { PremiumEmojiBar } from '@/components/PremiumEmojiBar'
import { AiTextTools } from '@/components/AiTextTools'
import { SystemAlert } from '@/components/SystemAlert'
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
interface ValidationIssue {
  id: string
  fieldId: string
  severity: 'error' | 'warning'
  title: string
  detail: string
}

const DRAFT_KEY = 'ivengo_constructor_draft_v2'

function isValidHttpUrl(value: string): boolean {
  if (!value.trim()) return true
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

interface LocalDraft {
  savedAt: string
  title: string
  content: string
  type: string
  language: string
  imageUrl: string
  ctaUrl: string
  buttons: ButtonRow[]
  pollQuestion: string
  pollOptions: string[]
  pollAnonymous: boolean
  scheduledAt: string
  channelIds: string[]
  abVariant: string
  abGroupId: string
}

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
  const [channelIds, setChannelIds] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)
  const [showMediaPicker, setShowMediaPicker] = useState(false)
  const [mediaAssets, setMediaAssets] = useState<MediaAsset[]>([])
  const contentRef = useRef<HTMLTextAreaElement>(null)
  const [abVariant, setAbVariant] = useState('')
  const [abGroupId, setAbGroupId] = useState('')
  const [sourcePostId, setSourcePostId] = useState('')
  const [recoverableDraft, setRecoverableDraft] = useState<LocalDraft | null>(null)
  const [autosaveState, setAutosaveState] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [validationVisible, setValidationVisible] = useState(false)
  const autosaveReady = useRef(false)

  useEffect(() => {
    api.getMedia().then(setMediaAssets).catch(() => setMediaAssets([]))
    if (!searchParams.get('from')) {
      try {
        const stored = localStorage.getItem(DRAFT_KEY)
        if (stored) setRecoverableDraft(JSON.parse(stored) as LocalDraft)
      } catch {
        localStorage.removeItem(DRAFT_KEY)
      }
    }
    const timer = setTimeout(() => { autosaveReady.current = true }, 600)
    return () => clearTimeout(timer)
  }, [])

  const isPollType = type === 'poll' || type === 'engagement_poll'
  const contentLimit = imageUrl ? 1024 : 4096
  const completion = useMemo(() => {
    const checks = [
      content.trim().length > 20,
      Boolean(title.trim()),
      Boolean(imageUrl),
      channelIds.length > 0,
      buttons.some((button) => button.text.trim() && button.url.trim()),
      !isPollType || (pollQuestion.trim().length > 0 && pollOptions.filter((option) => option.trim()).length >= 2),
    ]
    return Math.round((checks.filter(Boolean).length / checks.length) * 100)
  }, [buttons, channelIds.length, content, imageUrl, isPollType, pollOptions, pollQuestion, title])

  const validationIssues = useMemo<ValidationIssue[]>(() => {
    const issues: ValidationIssue[] = []
    if (!content.trim()) {
      issues.push({ id: 'content-empty', fieldId: 'post-content', severity: 'error', title: 'Немає тексту посту', detail: 'Додайте основний текст перед збереженням.' })
    } else if (content.length > contentLimit) {
      issues.push({ id: 'content-limit', fieldId: 'post-content', severity: 'error', title: 'Перевищено ліміт Telegram', detail: `Скоротіть текст на ${content.length - contentLimit} символів.` })
    }
    if (imageUrl && !isValidHttpUrl(imageUrl)) {
      issues.push({ id: 'image-url', fieldId: 'image-url', severity: 'error', title: 'Некоректна адреса зображення', detail: 'URL має починатися з http:// або https://.' })
    }
    if (ctaUrl && !isValidHttpUrl(ctaUrl)) {
      issues.push({ id: 'cta-url', fieldId: 'cta-url', severity: 'error', title: 'Некоректне CTA-посилання', detail: 'Перевірте адресу переходу.' })
    }
    buttons.forEach((button, index) => {
      const hasAnyValue = button.text.trim() || button.url.trim()
      if (hasAnyValue && (!button.text.trim() || !button.url.trim())) {
        issues.push({ id: `button-incomplete-${index}`, fieldId: `button-text-${index}`, severity: 'error', title: `Кнопка ${index + 1} заповнена не повністю`, detail: 'Потрібні і текст, і URL.' })
      } else if (button.url && !isValidHttpUrl(button.url)) {
        issues.push({ id: `button-url-${index}`, fieldId: `button-url-${index}`, severity: 'error', title: `Некоректний URL кнопки ${index + 1}`, detail: 'Використовуйте повне http(s)-посилання.' })
      }
    })
    if (isPollType && !pollQuestion.trim()) {
      issues.push({ id: 'poll-question', fieldId: 'poll-question', severity: 'error', title: 'Немає питання опитування', detail: 'Сформулюйте питання для аудиторії.' })
    }
    if (isPollType && pollOptions.filter((option) => option.trim()).length < 2) {
      issues.push({ id: 'poll-options', fieldId: 'poll-option-0', severity: 'error', title: 'Недостатньо варіантів відповіді', detail: 'Додайте щонайменше два варіанти.' })
    }
    if (scheduledAt && new Date(scheduledAt).getTime() <= Date.now()) {
      issues.push({ id: 'schedule-past', fieldId: 'scheduled-at', severity: 'error', title: 'Час публікації вже минув', detail: 'Оберіть дату і час у майбутньому.' })
    }
    if (!title.trim()) {
      issues.push({ id: 'title-missing', fieldId: 'post-title', severity: 'warning', title: 'Немає внутрішнього заголовка', detail: 'Заголовок полегшує пошук матеріалу в архіві.' })
    }
    if (!imageUrl) {
      issues.push({ id: 'image-missing', fieldId: 'image-url', severity: 'warning', title: 'Пост без візуалу', detail: 'Зображення зазвичай покращує помітність у стрічці.' })
    }
    if (channelIds.length === 0) {
      issues.push({ id: 'all-channels', fieldId: 'channel-picker', severity: 'warning', title: 'Обрані всі активні канали', detail: 'Перевірте, чи матеріал справді має вийти всюди.' })
    }
    return issues
  }, [buttons, channelIds.length, content, contentLimit, ctaUrl, imageUrl, isPollType, pollOptions, pollQuestion, scheduledAt, title])

  const errorIds = new Set(validationIssues.filter((issue) => issue.severity === 'error').map((issue) => issue.fieldId))
  const errorCount = validationIssues.filter((issue) => issue.severity === 'error').length
  const warningCount = validationIssues.filter((issue) => issue.severity === 'warning').length

  useEffect(() => {
    if (!autosaveReady.current || recoverableDraft) return
    setAutosaveState('saving')
    const timer = setTimeout(() => {
      const draft: LocalDraft = {
        savedAt: new Date().toISOString(),
        title,
        content,
        type,
        language,
        imageUrl,
        ctaUrl,
        buttons,
        pollQuestion,
        pollOptions,
        pollAnonymous,
        scheduledAt,
        channelIds,
        abVariant,
        abGroupId,
      }
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
      setAutosaveState('saved')
    }, 700)
    return () => clearTimeout(timer)
  }, [abGroupId, abVariant, buttons, channelIds, content, ctaUrl, imageUrl, language, pollAnonymous, pollOptions, pollQuestion, recoverableDraft, scheduledAt, title, type])

  function notify(text: string, t: 'success' | 'error' = 'success') {
    setMessage({ text, type: t })
    setTimeout(() => setMessage(null), 4000)
  }

  function restoreDraft() {
    if (!recoverableDraft) return
    const draft = recoverableDraft
    setTitle(draft.title)
    setContent(draft.content)
    setType(draft.type)
    setLanguage(draft.language)
    setImageUrl(draft.imageUrl)
    setCtaUrl(draft.ctaUrl)
    setButtons(draft.buttons)
    setPollQuestion(draft.pollQuestion)
    setPollOptions(draft.pollOptions)
    setPollAnonymous(draft.pollAnonymous)
    setScheduledAt(draft.scheduledAt)
    setChannelIds(draft.channelIds)
    setAbVariant(draft.abVariant)
    setAbGroupId(draft.abGroupId)
    setRecoverableDraft(null)
    notify('Локальний чернетковий сеанс відновлено')
  }

  function discardDraft() {
    localStorage.removeItem(DRAFT_KEY)
    setRecoverableDraft(null)
  }

  function scheduleAfter(hours: number) {
    const date = new Date(Date.now() + hours * 60 * 60 * 1000)
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
    setScheduledAt(local)
  }

  function focusIssue(fieldId: string) {
    const element = document.getElementById(fieldId)
    element?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    window.setTimeout(() => element?.focus(), 350)
  }

  function applyPost(p: Post) {
    setTitle(p.title ?? '')
    setContent(p.content)
    setType(p.type)
    setLanguage(p.language)
    setImageUrl(p.imageUrl ?? '')
    setCtaUrl(p.ctaUrl ?? '')
    setChannelIds(p.channelIds ?? [])
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
    setValidationVisible(true)
    const firstError = validationIssues.find((issue) => issue.severity === 'error')
    if (firstError) {
      notify(`Перевірте матеріал: ${firstError.title}`, 'error')
      focusIssue(firstError.fieldId)
      return
    }
    if (asScheduled && !scheduledAt) {
      notify('Оберіть дату та час у полі «Запланувати на» — або натисніть «На ревʼю», щоб зберегти чернетку', 'error')
      focusIssue('scheduled-at')
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
        channelIds: channelIds.length ? channelIds : undefined,
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
      localStorage.removeItem(DRAFT_KEY)
      router.push(`/posts/${post.id}`)
    } catch (e: unknown) {
      notify(e instanceof Error ? e.message : 'Помилка створення', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-7">
      <header className="grid gap-5 border-b border-tile-coal/30 pb-7 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <p className="eyebrow mb-3">Editorial studio · New material</p>
          <h1 className="page-title">Конструктор посту</h1>
          <p className="page-sub mt-3 max-w-2xl">Зберіть матеріал, перевірте його у Telegram-превʼю та передайте на ревʼю або заплануйте публікацію.</p>
        </div>
        <div className="flex items-center gap-4 border border-tile-coal/30 bg-[#fffdf9] px-4 py-3">
          <div className="relative flex h-12 w-12 items-center justify-center rounded-full border border-tile-coal/30">
            <span className="text-sm font-mono">{completion}%</span>
          </div>
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-tile-coal/45">Готовність</p>
            <p className="mt-1 text-sm">{completion >= 80 ? 'Майже готово' : completion >= 50 ? 'Потрібні деталі' : 'Почніть з тексту'}</p>
          </div>
        </div>
      </header>

      {message && (
        <SystemAlert tone={message.type === 'success' ? 'success' : 'error'} title={message.type === 'error' ? 'Матеріал потребує уваги' : 'Операцію виконано'}>
          {message.text}
        </SystemAlert>
      )}

      {loadingFrom && <div className="border border-tile-blue bg-tile-blue/10 px-4 py-3 text-sm text-tile-blue">Завантаження посту-основи…</div>}

      {recoverableDraft && (
        <div className="grid gap-4 border border-tile-coal bg-tile-pink/25 p-5 sm:grid-cols-[1fr_auto] sm:items-center">
          <div>
            <p className="eyebrow">Unsaved session found</p>
            <p className="mt-2 text-lg">Знайдено локальний чернетковий сеанс від {new Date(recoverableDraft.savedAt).toLocaleString('uk-UA')}.</p>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={discardDraft} className="btn-ghost">Видалити</button>
            <button type="button" onClick={restoreDraft} className="btn">Відновити</button>
          </div>
        </div>
      )}

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.18fr)_minmax(360px,0.82fr)]">
        <section className="min-w-0 space-y-5">

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

      <div className="panel-pad space-y-6">
        <div className="flex items-center justify-between border-b border-tile-coal/15 pb-4">
          <div>
            <p className="panel-label">Material settings</p>
            <h2 className="mt-2 text-2xl">Основний матеріал</h2>
          </div>
          <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-tile-coal/45">
            {autosaveState === 'saving' ? 'Saving…' : autosaveState === 'saved' ? 'Saved locally' : 'Autosave ready'}
          </p>
        </div>
        <div>
          <label className="lbl">Тип посту</label>
          <select value={type} onChange={(e) => setType(e.target.value)} className="fld">
            {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <label className="lbl">Заголовок</label>
            <input id="post-title" value={title} onChange={(e) => setTitle(e.target.value)} className="fld" placeholder="Необов'язково" />
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
          <textarea id="post-content" ref={contentRef} value={content} onChange={(e) => setContent(e.target.value)} rows={8}
            aria-invalid={errorIds.has('post-content')}
            className={`fld font-mono resize-y ${validationVisible && errorIds.has('post-content') ? 'fld-error' : ''}`} placeholder="*Жирний*, _курсив_, емодзі — все працює" />
          {validationVisible && errorIds.has('post-content') && (
            <p className="field-error">Потрібен валідний текст у межах Telegram-ліміту.</p>
          )}
          <div className="flex items-center justify-between gap-2 mt-2 flex-wrap">
            <p className={`text-[10px] font-mono uppercase tracking-wider ${content.length > contentLimit ? 'text-tile-rose font-bold' : 'text-tile-coal/45'}`}>
              {content.length} / {contentLimit} символів{content.length > contentLimit ? ' · перевищено ліміт Telegram' : ''}
            </p>
            <button type="button" onClick={() => { navigator.clipboard?.writeText(content); notify('Скопійовано') }}
              className="btn-ghost !px-0">Копіювати</button>
          </div>
          <PremiumEmojiBar textareaRef={contentRef} setContent={setContent} />
          <div className="mt-2">
            <AiTextTools text={content} language={language as 'uk' | 'ru'} onResult={setContent} notify={notify} />
          </div>
        </div>

        <div className="space-y-2">
          <label className="lbl">Зображення (URL)</label>
          <div className="flex gap-2">
            <input id="image-url" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)}
              aria-invalid={errorIds.has('image-url')}
              className={`fld flex-1 ${validationVisible && errorIds.has('image-url') ? 'fld-error' : ''}`} placeholder="https://..." />
            <button type="button" onClick={() => setShowMediaPicker(true)} className="btn-line whitespace-nowrap">🖼️ З бібліотеки</button>
          </div>
          {imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt="" className="mt-2 h-24 object-cover" />
          )}
          <div className="bg-white/5 p-3">
            <ImageGenerator
              onUse={(url) => setImageUrl(url)}
              onSave={async (url, prompt) => {
                const asset = await api.createMedia({ url, name: prompt.slice(0, 60), tags: 'AI' })
                setMediaAssets((m) => [asset, ...m])
                setImageUrl(url)
              }}
            />
          </div>
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
          <input id="cta-url" value={ctaUrl} onChange={(e) => setCtaUrl(e.target.value)}
            aria-invalid={errorIds.has('cta-url')}
            className={`fld ${validationVisible && errorIds.has('cta-url') ? 'fld-error' : ''}`} placeholder="https://..." />
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
                <input id={`button-text-${i}`} value={b.text} onChange={(e) => updateButton(i, 'text', e.target.value)}
                  aria-invalid={errorIds.has(`button-text-${i}`)}
                  placeholder="Текст кнопки" className={`fld flex-1 ${validationVisible && errorIds.has(`button-text-${i}`) ? 'fld-error' : ''}`} />
                <input id={`button-url-${i}`} value={b.url} onChange={(e) => updateButton(i, 'url', e.target.value)}
                  aria-invalid={errorIds.has(`button-url-${i}`)}
                  placeholder="https://..." className={`fld flex-[2] ${validationVisible && errorIds.has(`button-url-${i}`) ? 'fld-error' : ''}`} />
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
            <input id="poll-question" value={pollQuestion} onChange={(e) => setPollQuestion(e.target.value)}
              aria-invalid={errorIds.has('poll-question')}
              placeholder="Питання" className={`fld ${validationVisible && errorIds.has('poll-question') ? 'fld-error' : ''}`} />
            <div className="space-y-2">
              {pollOptions.map((opt, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <span className="w-6 h-6 bg-white/10 flex items-center justify-center text-xs text-white/70">{i + 1}</span>
                  <input id={`poll-option-${i}`} value={opt} onChange={(e) => updateOption(i, e.target.value)}
                    aria-invalid={i === 0 && errorIds.has('poll-option-0')}
                    placeholder={`Варіант ${i + 1}`} className={`fld flex-1 ${validationVisible && i === 0 && errorIds.has('poll-option-0') ? 'fld-error' : ''}`} />
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

        <div id="channel-picker" tabIndex={-1}>
          <ChannelPicker value={channelIds} onChange={setChannelIds} />
        </div>

        <div>
          <label className="lbl">Запланувати на</label>
          <input id="scheduled-at" type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)}
            aria-invalid={errorIds.has('scheduled-at')}
            className={`fld w-auto ${validationVisible && errorIds.has('scheduled-at') ? 'fld-error' : ''}`} />
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" onClick={() => scheduleAfter(1)} className="btn-ghost !px-0">Через 1 год</button>
            <button type="button" onClick={() => scheduleAfter(3)} className="btn-ghost">Через 3 год</button>
            <button type="button" onClick={() => scheduleAfter(24)} className="btn-ghost">Завтра</button>
            {scheduledAt && <button type="button" onClick={() => setScheduledAt('')} className="btn-ghost text-tile-rose">Очистити</button>}
          </div>
          <p className="text-xs text-tile-coal/45 mt-2">
            {scheduledAt
              ? `Публікація запланована на ${new Date(scheduledAt).toLocaleString('uk-UA')}.`
              : 'Оберіть дату й час, щоб активувати кнопку «Запланувати публікацію». Без дати — збережіть на ревʼю.'}
          </p>
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

        <div className="sticky bottom-3 z-20 -mx-2 flex flex-wrap gap-3 border border-tile-coal bg-[#fffdf9]/95 p-3 shadow-[0_14px_40px_rgba(80,26,44,0.14)] backdrop-blur">
          <button onClick={() => save(false)} disabled={saving || content.length > contentLimit} className="btn-line flex-1">
            {saving ? 'Збереження…' : 'Передати на ревʼю'}
          </button>
          <button onClick={() => save(true)} disabled={saving || !scheduledAt || content.length > contentLimit} className="btn flex-1">
            {saving ? 'Збереження…' : 'Запланувати →'}
          </button>
        </div>
      </div>
        </section>

        <aside className="space-y-4 xl:sticky xl:top-28">
          <div className={`border ${errorCount ? 'border-tile-rose bg-tile-rose/5' : 'border-tile-coal bg-[#fffdf9]'}`}>
            <div className="flex items-center justify-between border-b border-current/20 px-5 py-4">
              <div>
                <p className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] opacity-55">Preflight validation</p>
                <h2 className="mt-1 text-2xl font-bold">Перевірка матеріалу</h2>
              </div>
              <span className={`flex h-11 min-w-11 items-center justify-center rounded-full border-2 font-mono text-sm font-bold ${
                errorCount ? 'border-tile-rose text-tile-rose' : warningCount ? 'border-[#a76b22] text-[#744714]' : 'border-[#668075] text-[#527064]'
              }`}>
                {errorCount || warningCount || 'OK'}
              </span>
            </div>
            {validationIssues.length === 0 ? (
              <p className="p-5 text-sm font-semibold text-[#527064]">Матеріал готовий до передачі у workflow.</p>
            ) : (
              <div className="divide-y divide-tile-coal/15">
                {validationIssues.map((issue) => (
                  <button
                    key={issue.id}
                    type="button"
                    onClick={() => focusIssue(issue.fieldId)}
                    className="grid w-full grid-cols-[auto_1fr_auto] items-start gap-3 p-4 text-left transition-colors hover:bg-white/60"
                  >
                    <span className={`mt-1 h-2.5 w-2.5 rounded-full ${issue.severity === 'error' ? 'bg-tile-rose' : 'bg-[#b47a31]'}`} />
                    <span>
                      <span className="block text-sm font-bold">{issue.title}</span>
                      <span className="mt-1 block text-xs leading-relaxed opacity-60">{issue.detail}</span>
                    </span>
                    <span className="font-mono text-[9px] font-bold uppercase tracking-wider opacity-45">Fix →</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <TelegramPreview
            title={title}
            content={content}
            imageUrl={imageUrl}
            buttons={buttons}
            pollQuestion={isPollType ? pollQuestion : ''}
            pollOptions={isPollType ? pollOptions.filter(Boolean) : []}
            scheduledAt={scheduledAt}
          />
        </aside>
      </div>
    </div>
  )
}

function TelegramPreview({
  title,
  content,
  imageUrl,
  buttons,
  pollQuestion,
  pollOptions,
  scheduledAt,
}: {
  title: string
  content: string
  imageUrl: string
  buttons: ButtonRow[]
  pollQuestion: string
  pollOptions: string[]
  scheduledAt: string
}) {
  const activeButtons = buttons.filter((button) => button.text.trim())

  return (
    <div className="overflow-hidden border border-tile-coal bg-tile-coal text-tile-amber">
      <div className="flex items-center justify-between border-b border-tile-amber/25 px-5 py-4">
        <div>
          <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-tile-amber/50">Live preview</p>
          <h2 className="mt-1 text-xl">Telegram</h2>
        </div>
        <span className="h-2 w-2 rounded-full bg-tile-teal" />
      </div>

      <div className="bg-[#d9e7ee] p-4 sm:p-6">
        <div className="ml-auto max-w-[92%] overflow-hidden rounded-[18px_18px_5px_18px] bg-[#fffdf9] text-tile-coal shadow-[0_10px_30px_rgba(39,56,65,0.16)]">
          {imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt="" className="aspect-[16/10] w-full object-cover" />
          )}
          <div className="p-4">
            {title && <p className="mb-2 text-base font-semibold">{title}</p>}
            <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed">
              {content || 'Текст посту з’явиться тут у реальному часі…'}
            </p>
            {pollQuestion && (
              <div className="mt-4 border-t border-tile-coal/15 pt-3">
                <p className="font-semibold">{pollQuestion}</p>
                <div className="mt-2 space-y-1.5">
                  {pollOptions.map((option) => (
                    <div key={option} className="border border-[#5aa4d6] px-3 py-2 text-center text-sm text-[#2783bd]">{option}</div>
                  ))}
                </div>
              </div>
            )}
            {activeButtons.length > 0 && (
              <div className="mt-4 grid gap-1.5">
                {activeButtons.map((button, index) => (
                  <div key={`${button.text}-${index}`} className="bg-[#e9f2f7] px-3 py-2 text-center text-sm font-medium text-[#2783bd]">{button.text}</div>
                ))}
              </div>
            )}
            <p className="mt-3 text-right font-mono text-[9px] text-tile-coal/35">
              {new Date().toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })} ✓✓
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 border-t border-tile-amber/25 font-mono text-[9px] uppercase tracking-[0.14em]">
        <div className="border-r border-tile-amber/25 px-4 py-3 text-tile-amber/55">
          {imageUrl ? 'Caption limit · 1024' : 'Text limit · 4096'}
        </div>
        <div className="px-4 py-3 text-right text-tile-amber/55">
          {scheduledAt ? new Date(scheduledAt).toLocaleString('uk-UA') : 'Not scheduled'}
        </div>
      </div>
    </div>
  )
}
