'use client'
import { useEffect, useState } from 'react'
import { api, type Channel } from '@/lib/api'

/**
 * Multi-select of target publics. Empty selection = "all active channels"
 * (the backend default). Renders as tile chips on a coal panel.
 */
export function ChannelPicker({
  value,
  onChange,
  label = 'Пабліки (куди публікувати)',
}: {
  value: string[]
  onChange: (ids: string[]) => void
  label?: string
}) {
  const [channels, setChannels] = useState<Channel[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getChannels()
      .then((cs) => setChannels(cs.filter((c) => c.isActive)))
      .catch(() => setChannels([]))
      .finally(() => setLoading(false))
  }, [])

  function toggle(id: string) {
    onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id])
  }

  const allSelected = value.length === 0

  return (
    <div>
      <label className="lbl">{label}</label>
      {loading ? (
        <p className="text-xs text-tile-coal/45">Завантаження каналів…</p>
      ) : channels.length === 0 ? (
        <p className="border border-tile-rose/40 bg-tile-rose/5 p-3 text-xs text-tile-rose">Немає активних каналів. Додайте їх на сторінці «Канали».</p>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => onChange([])}
            className={`min-h-11 border px-3 py-2 text-left font-mono text-[9px] uppercase tracking-wider transition-colors ${
              allSelected ? 'border-tile-coal bg-tile-coal text-tile-amber' : 'border-tile-coal/25 bg-[#fffdf9] text-tile-coal/60 hover:border-tile-coal'
            }`}
          >
            Усі активні ({channels.length})
          </button>
          {channels.map((c) => {
            const on = value.includes(c.id)
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => toggle(c.id)}
                className={`min-h-11 border px-3 py-2 text-left text-sm transition-colors ${
                  on ? 'border-tile-coal bg-tile-pink/45 text-tile-coal' : 'border-tile-coal/25 bg-[#fffdf9] text-tile-coal/65 hover:border-tile-coal'
                }`}
              >
                {on ? '✓ ' : ''}{c.name}
              </button>
            )
          })}
        </div>
      )}
      {!allSelected && (
        <p className="mt-2 text-[11px] text-tile-coal/45">Обрано {value.length} — пост піде лише в ці канали.</p>
      )}
    </div>
  )
}
