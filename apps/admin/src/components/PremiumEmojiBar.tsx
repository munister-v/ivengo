'use client'
import { useEffect, useState, type RefObject } from 'react'
import { api, emojiPlaceholder, type CustomEmoji } from '@/lib/api'

interface PremiumEmojiBarProps {
  textareaRef: RefObject<HTMLTextAreaElement | null>
  /** Functional content setter, e.g. the `setContent` from `useState`. */
  setContent: (updater: (c: string) => string) => void
}

/**
 * Compact palette of the Premium-emoji library. Clicking an emoji inserts its
 * `[ce:id:fallback]` placeholder at the current cursor position in the linked
 * textarea (falls back to appending if nothing is focused).
 */
export function PremiumEmojiBar({ textareaRef, setContent }: PremiumEmojiBarProps) {
  const [emoji, setEmoji] = useState<CustomEmoji[]>([])
  const [filter, setFilter] = useState('')

  useEffect(() => {
    api.getCustomEmoji().then(setEmoji).catch(() => {})
  }, [])

  if (emoji.length === 0) return null

  function insert(e: CustomEmoji) {
    const ph = emojiPlaceholder(e)
    const el = textareaRef.current
    if (!el) {
      setContent((c) => c + ph)
      return
    }
    const start = el.selectionStart ?? el.value.length
    const end = el.selectionEnd ?? el.value.length
    setContent((c) => c.slice(0, start) + ph + c.slice(end))
    requestAnimationFrame(() => {
      el.focus()
      const pos = start + ph.length
      el.setSelectionRange(pos, pos)
    })
  }

  const q = filter.trim().toLowerCase()
  const filtered = q
    ? emoji.filter((e) => e.label.toLowerCase().includes(q) || e.category.toLowerCase().includes(q))
    : emoji

  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="eyebrow !text-white/40">★ Преміум емодзі — клік вставляє у курсор</p>
        {emoji.length > 8 && (
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Пошук..."
            className="fld !w-32 !py-1 text-xs"
          />
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {filtered.map((e) => (
          <button
            key={e.id}
            type="button"
            title={`${e.label} (${e.category}) → ${emojiPlaceholder(e)}`}
            onClick={() => insert(e)}
            className="bg-white/5 hover:bg-tile-pink hover:text-tile-coal border border-white/10 px-2 py-1 text-base leading-none transition-colors"
          >
            {e.fallback}
          </button>
        ))}
      </div>
    </div>
  )
}
