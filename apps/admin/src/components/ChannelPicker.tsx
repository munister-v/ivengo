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
        <p className="text-xs text-white/40">Завантаження каналів…</p>
      ) : channels.length === 0 ? (
        <p className="text-xs text-white/40">Немає активних каналів. Додайте їх на сторінці «Канали».</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => onChange([])}
            className={`text-xs font-mono uppercase tracking-wider px-2.5 py-1.5 transition-colors ${
              allSelected ? 'bg-tile-teal text-tile-coal' : 'bg-white/5 text-white/60 hover:bg-white/10'
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
                className={`text-xs px-2.5 py-1.5 transition-colors ${
                  on ? 'bg-tile-pink text-tile-coal font-bold' : 'bg-white/5 text-white/70 hover:bg-white/10'
                }`}
              >
                {on ? '✓ ' : ''}{c.name}
              </button>
            )
          })}
        </div>
      )}
      {!allSelected && (
        <p className="text-[11px] text-white/40 mt-1.5">Обрано {value.length} — пост піде лише в ці пабліки.</p>
      )}
    </div>
  )
}
