'use client'
import { useEffect, useState } from 'react'
import { api, type Channel } from '@/lib/api'

const emptyForm = { name: '', chatId: '', botToken: '', description: '', isActive: true }

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

  async function load() {
    setLoading(true)
    try {
      setChannels(await api.getChannels())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  function startCreate() {
    setEditingId(null)
    setForm(emptyForm)
    setError('')
    setShowForm(true)
  }

  function startEdit(c: Channel) {
    setEditingId(c.id)
    setForm({
      name: c.name,
      chatId: c.chatId,
      botToken: c.botToken,
      description: c.description ?? '',
      isActive: c.isActive,
    })
    setError('')
    setShowForm(true)
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

      {showForm && (
        <div className="panel-pad space-y-3">
          <h2 className="panel-label">{editingId ? 'Редагувати канал' : 'Новий канал'}</h2>
          <div>
            <label className="lbl">Назва</label>
            <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Ivengo Slot" className="fld" />
          </div>
          <div>
            <label className="lbl">Chat ID / username</label>
            <input value={form.chatId} onChange={(e) => setForm((f) => ({ ...f, chatId: e.target.value }))} placeholder="@ivengo_slot або -1001234567890" className="fld" />
          </div>
          <div>
            <label className="lbl">Bot token</label>
            <input value={form.botToken} onChange={(e) => setForm((f) => ({ ...f, botToken: e.target.value }))} placeholder="123456:AAExample..." className="fld font-mono" />
          </div>
          <div>
            <label className="lbl">Опис (необов&apos;язково)</label>
            <input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className="fld" />
          </div>
          <label className="flex items-center gap-2 text-sm text-white/70">
            <input type="checkbox" checked={form.isActive} onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))} className="accent-tile-pink" />
            Активний (бере участь у автопублікації)
          </label>
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
