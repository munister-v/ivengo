'use client'
import { useEffect, useState } from 'react'
import { api, type MediaAsset } from '@/lib/api'

export default function MediaPage() {
  const [assets, setAssets] = useState<MediaAsset[]>([])
  const [loading, setLoading] = useState(true)
  const [url, setUrl] = useState('')
  const [name, setName] = useState('')
  const [tags, setTags] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    try {
      setAssets(await api.getMedia())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function add() {
    if (!url) return
    setSaving(true)
    setError('')
    try {
      await api.createMedia({ url, name: name || undefined, tags: tags || undefined })
      setUrl('')
      setName('')
      setTags('')
      await load()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Помилка додавання')
    } finally {
      setSaving(false)
    }
  }

  async function remove(id: string) {
    if (!confirm('Видалити зображення з бібліотеки?')) return
    await api.deleteMedia(id)
    await load()
  }

  function copy(u: string) {
    navigator.clipboard?.writeText(u)
  }

  return (
    <div className="space-y-4 max-w-3xl">
      <h1 className="page-title">🖼️ Бібліотека медіа</h1>

      <div className="panel-pad space-y-3">
        <h2 className="panel-label">Додати зображення за URL</h2>
        <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com/image.jpg" className="fld" />
        <div className="grid grid-cols-2 gap-3">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Назва (необов'язково)" className="fld" />
          <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="Теги через кому (бонус, слот...)" className="fld" />
        </div>
        {error && <p className="text-sm text-white bg-tile-rose px-3 py-2">{error}</p>}
        <button onClick={add} disabled={saving || !url} className="btn">{saving ? 'Додавання...' : '+ Додати'}</button>
      </div>

      {loading ? (
        <div className="eyebrow animate-pulse">Завантаження…</div>
      ) : assets.length === 0 ? (
        <p className="panel-pad text-sm text-white/40 text-center">Бібліотека порожня</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {assets.map((a) => (
            <div key={a.id} className="panel overflow-hidden group relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={a.url} alt={a.name ?? ''} className="w-full h-28 object-cover bg-black/40" />
              <div className="p-2">
                {a.name && <p className="text-xs font-medium text-white truncate">{a.name}</p>}
                {a.tags && <p className="text-[10px] text-white/40 truncate font-mono">{a.tags}</p>}
                <div className="flex items-center justify-between mt-1 text-[11px] font-mono uppercase tracking-wider">
                  <button onClick={() => copy(a.url)} className="text-tile-pink hover:text-tile-teal">URL</button>
                  <button onClick={() => remove(a.id)} className="text-tile-rose hover:text-white">Видал.</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
