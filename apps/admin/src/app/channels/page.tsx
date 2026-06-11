'use client'
import { useEffect, useState } from 'react'
import { api, type Channel, type ChannelValidation } from '@/lib/api'

const emptyForm = { name: '', chatId: '', botToken: '', description: '', isActive: true, premiumEmoji: false }

export default function ChannelsPage() {
  const [channels, setChannels] = useState<Channel[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [testingId, setTestingId] = useState<string | null>(null)
  const [testResult, setTestResult] = useState<Record<string, string>>({})
  const [showGuide, setShowGuide] = useState(false)
  const [validating, setValidating] = useState(false)
  const [validation, setValidation] = useState<ChannelValidation | null>(null)
  const [validationError, setValidationError] = useState('')

  async function load() {
    setLoading(true)
    try {
      const list = await api.getChannels()
      setChannels(list)
      if (list.length === 0) setShowGuide(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  function startCreate() {
    setEditingId(null)
    setForm(emptyForm)
    setError('')
    setValidation(null)
    setValidationError('')
    setShowForm(true)
    setShowGuide(true)
  }

  function startEdit(c: Channel) {
    setEditingId(c.id)
    setForm({
      name: c.name,
      chatId: c.chatId,
      botToken: c.botToken,
      description: c.description ?? '',
      isActive: c.isActive,
      premiumEmoji: c.premiumEmoji ?? false,
    })
    setError('')
    setValidation(null)
    setValidationError('')
    setShowForm(true)
  }

  async function validate() {
    if (!form.botToken || !form.chatId) {
      setValidationError('Спочатку вкажіть Bot token та Chat ID')
      return
    }
    setValidating(true)
    setValidation(null)
    setValidationError('')
    try {
      const res = await api.validateChannel({ botToken: form.botToken, chatId: form.chatId })
      setValidation(res)
    } catch (e: unknown) {
      setValidationError(e instanceof Error ? e.message : 'Помилка перевірки')
    } finally {
      setValidating(false)
    }
  }

  async function save() {
    if (!form.name || !form.chatId || !form.botToken) {
      setError('Заповніть назву, chat ID та токен бота')
      return
    }
    setSaving(true)
    setError('')
    try {
      const payload = { ...form, description: form.description || undefined }
      if (editingId) {
        await api.updateChannel(editingId, payload)
      } else {
        await api.createChannel(payload)
      }
      setShowForm(false)
      await load()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Помилка збереження')
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(c: Channel) {
    await api.updateChannel(c.id, { isActive: !c.isActive })
    await load()
  }

  async function remove(c: Channel) {
    if (!confirm(`Видалити (деактивувати) канал "${c.name}"?`)) return
    await api.deleteChannel(c.id)
    await load()
  }

  async function test(c: Channel) {
    setTestingId(c.id)
    setTestResult((r) => ({ ...r, [c.id]: '' }))
    try {
      await api.testChannel(c.id)
      setTestResult((r) => ({ ...r, [c.id]: '✅ Повідомлення надіслано' }))
    } catch (e: unknown) {
      setTestResult((r) => ({ ...r, [c.id]: `❌ ${e instanceof Error ? e.message : 'Помилка'}` }))
    } finally {
      setTestingId(null)
    }
  }

  return (
    <div className="max-w-2xl space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="page-title">📡 Канали</h1>
        <button onClick={startCreate} className="btn-coal">+ Додати канал</button>
      </div>

      <div className="panel-pad space-y-2">
        <button type="button" onClick={() => setShowGuide((v) => !v)} className="flex w-full items-center justify-between gap-2 text-left">
          <h2 className="panel-label !mb-0">📖 Як підключити бота і канал</h2>
          <span className="text-white/40 text-xs font-mono">{showGuide ? '▲ згорнути' : '▼ розгорнути'}</span>
        </button>
        {showGuide && (
          <ol className="space-y-2 text-sm text-white/70 list-decimal list-inside">
            <li>
              У Telegram відкрийте <span className="font-mono text-tile-pink">@BotFather</span>, надішліть команду{' '}
              <code className="font-mono text-tile-teal">/newbot</code> і дайте боту ім&apos;я та username.
              BotFather надішле <strong className="text-white">токен</strong> виду{' '}
              <span className="font-mono text-tile-pink">123456789:AA...</span> — скопіюйте його у поле «Bot token» нижче.
            </li>
            <li>
              Відкрийте свій канал → <strong className="text-white">Адміністратори</strong> → <strong className="text-white">Додати адміністратора</strong>{' '}
              → знайдіть вашого бота за username і додайте його з правом{' '}
              <strong className="text-white">«Публікація повідомлень»</strong>.
            </li>
            <li>
              Вкажіть <strong className="text-white">Chat ID</strong>: для публічного каналу — це{' '}
              <span className="font-mono text-tile-teal">@username_каналу</span>. Для приватного каналу потрібен числовий ID
              виду <span className="font-mono text-tile-teal">-1001234567890</span> — його можна отримати, переславши будь-яке
              повідомлення з каналу боту <span className="font-mono text-tile-pink">@userinfobot</span> або через{' '}
              <span className="font-mono text-tile-teal">@getidsbot</span>.
            </li>
            <li>
              Заповніть форму нижче і натисніть <strong className="text-white">«🔍 Перевірити підключення»</strong> — це
              підтвердить, що токен дійсний, бот бачить канал і має право публікувати. Потім «Зберегти» та «Тест» —
              щоб надіслати тестове повідомлення.
            </li>
          </ol>
        )}
      </div>

      {showForm && (
        <div className="panel-pad space-y-3">
          <h2 className="panel-label">{editingId ? 'Редагувати канал' : 'Новий канал'}</h2>
          <div>
            <label className="lbl">Назва</label>
            <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Ivengo Slot" className="fld" />
          </div>
          <div>
            <label className="lbl">Chat ID / username / посилання</label>
            <input value={form.chatId} onChange={(e) => { setForm((f) => ({ ...f, chatId: e.target.value })); setValidation(null); setValidationError('') }} placeholder="@ivengo_slot, t.me/ivengo_slot або -1001234567890" className="fld" />
            <p className="text-xs text-white/40 mt-1">Можна вставити будь-що: <span className="font-mono text-tile-pink">@нік</span>, посилання <span className="font-mono text-tile-pink">https://t.me/нік</span> чи числовий <span className="font-mono text-tile-pink">-100…</span> — система сама приведе до потрібного формату. Приватні посилання-запрошення (t.me/+…) не підходять — потрібен числовий ID.</p>
          </div>
          <div>
            <label className="lbl">Bot token</label>
            <input value={form.botToken} onChange={(e) => { setForm((f) => ({ ...f, botToken: e.target.value })); setValidation(null); setValidationError('') }} placeholder="123456:AAExample..." className="fld font-mono" />
          </div>
          <div>
            <label className="lbl">Опис (необов&apos;язково)</label>
            <input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className="fld" />
          </div>
          <label className="flex items-center gap-2 text-sm text-white/70">
            <input type="checkbox" checked={form.isActive} onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))} className="accent-tile-pink" />
            Активний (бере участь у автопублікації)
          </label>
          <label className="flex items-start gap-2 text-sm text-white/70">
            <input type="checkbox" checked={form.premiumEmoji} onChange={(e) => setForm((f) => ({ ...f, premiumEmoji: e.target.checked }))} className="accent-tile-pink mt-0.5" />
            <span>
              Telegram Premium — кастомні емодзі
              <span className="block text-xs text-white/40">Увімкніть, якщо адмін/бот каналу має Premium. Плейсхолдери <code className="font-mono text-tile-pink">[ce:…]</code> у тексті стануть преміум-емодзі.</span>
            </span>
          </label>

          <div className="space-y-2">
            <button type="button" onClick={validate} disabled={validating} className="btn-line">
              {validating ? 'Перевірка...' : '🔍 Перевірити підключення'}
            </button>
            {validationError && <p className="text-sm text-white bg-tile-rose px-3 py-2">{validationError}</p>}
            {validation && (
              <div className={`text-sm px-3 py-2 ${validation.canPost === false ? 'bg-tile-rose text-white' : 'bg-tile-teal/20 text-white'}`}>
                <p>🤖 Бот: <span className="font-mono">@{validation.bot.username ?? validation.bot.name}</span></p>
                <p>📡 Канал: <span className="font-mono">{validation.chat.title ?? validation.chat.username ?? form.chatId}</span> ({validation.chat.type})</p>
                {validation.normalizedChatId && validation.normalizedChatId !== form.chatId && (
                  <p className="text-white/60">Chat ID збережеться як <span className="font-mono text-tile-teal">{validation.normalizedChatId}</span></p>
                )}
                {validation.memberStatus && <p>Статус бота: <span className="font-mono">{validation.memberStatus}</span></p>}
                {validation.canPost === false && validation.warning && <p className="mt-1">⚠️ {validation.warning}</p>}
                {validation.canPost && <p className="mt-1">✅ Все гаразд — можна зберігати канал.</p>}
              </div>
            )}
          </div>

          {error && <p className="text-sm text-white bg-tile-rose px-3 py-2">{error}</p>}
          <div className="flex gap-2 pt-1">
            <button onClick={save} disabled={saving} className="btn">{saving ? 'Збереження...' : 'Зберегти'}</button>
            <button onClick={() => setShowForm(false)} className="btn-ghost">Скасувати</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="eyebrow animate-pulse">Завантаження…</div>
      ) : channels.length === 0 ? (
        <p className="panel-pad text-sm text-white/40 text-center">Канали не налаштовані</p>
      ) : (
        <div className="panel divide-y divide-white/10">
          {channels.map((c) => (
            <div key={c.id} className="px-4 py-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span>{c.isActive ? '🟢' : '⚪️'}</span>
                    <p className="text-sm font-medium text-white truncate">{c.name}</p>
                  </div>
                  <p className="text-xs text-white/40 truncate font-mono">{c.chatId}{c.description ? ` · ${c.description}` : ''}</p>
                  {testResult[c.id] && <p className="text-xs mt-1 text-white/70">{testResult[c.id]}</p>}
                </div>
                <div className="flex items-center gap-3 flex-shrink-0 text-xs font-mono uppercase tracking-wider">
                  <button onClick={() => test(c)} disabled={testingId === c.id} className="text-tile-pink hover:text-tile-teal disabled:opacity-50">
                    {testingId === c.id ? '...' : 'Тест'}
                  </button>
                  <button onClick={() => toggleActive(c)} className="text-white/50 hover:text-white">
                    {c.isActive ? 'Вимк' : 'Увімк'}
                  </button>
                  <button onClick={() => startEdit(c)} className="text-white/50 hover:text-white">Ред.</button>
                  <button onClick={() => remove(c)} className="text-tile-rose hover:text-white">Видал.</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
