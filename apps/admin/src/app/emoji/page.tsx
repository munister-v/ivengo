'use client'
import { useEffect, useState, useMemo } from 'react'
import { api, emojiPlaceholder, type CustomEmoji, type CustomEmojiVerifyResult } from '@/lib/api'

const emptyForm = { label: '', customEmojiId: '', fallback: '', category: 'general' }

export default function EmojiPage() {
  const [emoji, setEmoji] = useState<CustomEmoji[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [verify, setVerify] = useState<CustomEmojiVerifyResult | null>(null)
  const [verifying, setVerifying] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    try {
      setEmoji(await api.getCustomEmoji())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const grouped = useMemo(() => {
    const map: Record<string, CustomEmoji[]> = {}
    for (const e of emoji) (map[e.category] ??= []).push(e)
    return map
  }, [emoji])

  async function runVerify() {
    if (!/^\d+$/.test(form.customEmojiId)) {
      setError('custom_emoji_id має бути числом')
      return
    }
    setVerifying(true)
    setError('')
    setVerify(null)
    try {
      const { results } = await api.verifyCustomEmoji([form.customEmojiId])
      const r = results[0]
      setVerify(r)
      // Auto-fill fallback / label from Telegram when found and fields are empty
      if (r?.valid) {
        setForm((f) => ({
          ...f,
          fallback: f.fallback || r.emoji || '',
          label: f.label || r.setName || '',
        }))
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Помилка перевірки')
    } finally {
      setVerifying(false)
    }
  }

  async function save() {
    if (!form.label || !form.customEmojiId || !form.fallback) {
      setError('Заповніть назву, custom_emoji_id та fallback-емодзі')
      return
    }
    setSaving(true)
    setError('')
    try {
      await api.createCustomEmoji({
        ...form,
        isAnimated: verify?.isAnimated ?? false,
        setName: verify?.setName ?? undefined,
      })
      setForm(emptyForm)
      setVerify(null)
      await load()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Помилка збереження')
    } finally {
      setSaving(false)
    }
  }

  async function remove(e: CustomEmoji) {
    if (!confirm(`Видалити "${e.label}" з бібліотеки?`)) return
    await api.deleteCustomEmoji(e.id)
    await load()
  }

  async function copyPlaceholder(e: CustomEmoji) {
    const ph = emojiPlaceholder(e)
    try {
      await navigator.clipboard.writeText(ph)
      setCopied(e.id)
      setTimeout(() => setCopied((c) => (c === e.id ? null : c)), 1500)
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <div className="max-w-3xl space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="page-title">★ Преміум емодзі</h1>
          <p className="page-sub">Бібліотека Telegram Premium custom emoji. Вставляйте у текст через плейсхолдер <code className="font-mono">[ce:…]</code>.</p>
        </div>
      </div>

      <div className="panel-pad space-y-3">
        <h2 className="panel-label">Додати емодзі</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <label className="lbl">custom_emoji_id</label>
            <div className="flex gap-2">
              <input
                value={form.customEmojiId}
                onChange={(e) => setForm((f) => ({ ...f, customEmojiId: e.target.value.trim() }))}
                placeholder="5368324170671202286"
                className="fld font-mono flex-1"
              />
              <button onClick={runVerify} disabled={verifying} className="btn-line whitespace-nowrap">
                {verifying ? '...' : 'Перевірити'}
              </button>
            </div>
            {verify && (
              <p className={`text-xs mt-1.5 ${verify.valid ? 'text-tile-teal' : 'text-tile-pink'}`}>
                {verify.valid
                  ? `✓ Знайдено: ${verify.emoji ?? ''} ${verify.setName ? `· набір «${verify.setName}»` : ''}${verify.isAnimated ? ' · анімований' : ''}`
                  : '✕ Не знайдено через бот активного каналу (перевірте id або Premium-канал)'}
              </p>
            )}
          </div>
          <div>
            <label className="lbl">Назва</label>
            <input value={form.label} onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))} placeholder="Casino chip" className="fld" />
          </div>
          <div>
            <label className="lbl">Fallback-емодзі</label>
            <input value={form.fallback} onChange={(e) => setForm((f) => ({ ...f, fallback: e.target.value }))} placeholder="🎰" className="fld" maxLength={16} />
          </div>
          <div>
            <label className="lbl">Категорія</label>
            <input value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value || 'general' }))} placeholder="general" className="fld" />
          </div>
        </div>
        {error && <p className="text-sm text-white bg-tile-rose px-3 py-2">{error}</p>}
        <div className="flex gap-2 pt-1">
          <button onClick={save} disabled={saving} className="btn">{saving ? 'Збереження...' : 'Додати в бібліотеку'}</button>
        </div>
      </div>

      {loading ? (
        <div className="eyebrow animate-pulse">Завантаження…</div>
      ) : emoji.length === 0 ? (
        <p className="panel-pad text-sm text-white/40 text-center">Бібліотека порожня</p>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([category, items]) => (
            <div key={category} className="space-y-2">
              <h3 className="eyebrow">{category}</h3>
              <div className="panel divide-y divide-white/10">
                {items.map((e) => (
                  <div key={e.id} className="px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-2xl leading-none">{e.fallback}</span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white truncate">
                          {e.label}
                          {e.isAnimated && <span className="ml-2 text-[10px] font-mono uppercase text-tile-teal">anim</span>}
                        </p>
                        <p className="text-xs text-white/40 truncate font-mono">{e.customEmojiId}{e.setName ? ` · ${e.setName}` : ''}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0 text-xs font-mono uppercase tracking-wider">
                      <button onClick={() => copyPlaceholder(e)} className="text-tile-pink hover:text-tile-teal">
                        {copied === e.id ? 'Скопійовано' : 'Копіювати [ce]'}
                      </button>
                      <button onClick={() => remove(e)} className="text-tile-rose hover:text-white">Видал.</button>
                    </div>
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
