'use client'
import { useState } from 'react'
import { api } from '@/lib/api'

const SIZES = {
  square: { width: 512, height: 512, label: '⬛ 1:1' },
  portrait: { width: 512, height: 768, label: '📱 9:16' },
  landscape: { width: 768, height: 512, label: '🖥️ 16:9' },
} as const

type SizeKey = keyof typeof SIZES

interface ImageGeneratorProps {
  /** Called when the user picks the generated image to use right away. */
  onUse: (url: string, prompt: string) => void
  /** If provided, shows a "Зберегти в бібліотеку" button. */
  onSave?: (url: string, prompt: string) => void
}

/** Free AI image generation panel (Pollinations.ai — no API key, no limits). */
export function ImageGenerator({ onUse, onSave }: ImageGeneratorProps) {
  const [prompt, setPrompt] = useState('')
  const [size, setSize] = useState<SizeKey>('square')
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function generate() {
    if (!prompt.trim()) return
    setLoading(true)
    setError('')
    try {
      const dims = SIZES[size]
      const res = await api.generateImage({ prompt, width: dims.width, height: dims.height })
      setUrl(res.url)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Помилка генерації')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-2">
      <p className="eyebrow !text-white/40">🎨 Згенерувати зображення (безкоштовно, AI)</p>
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              generate()
            }
          }}
          placeholder="Опис зображення англійською: neon casino chips on black table, cinematic"
          className="fld flex-1"
        />
        <select value={size} onChange={(e) => setSize(e.target.value as SizeKey)} className="fld sm:w-32">
          {Object.entries(SIZES).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
        <button type="button" onClick={generate} disabled={loading || !prompt.trim()} className="btn-line whitespace-nowrap">
          {loading ? 'Генерація...' : '🎨 Згенерувати'}
        </button>
      </div>
      {error && <p className="text-sm text-white bg-tile-rose px-3 py-2">{error}</p>}
      {loading && (
        <div className="h-40 bg-white/5 animate-pulse flex items-center justify-center text-xs text-white/40 text-center px-4">
          Генерується через спільну безкоштовну мережу AI Horde...
          зазвичай 30–90 секунд, іноді довше у пік
        </div>
      )}
      {!loading && url && (
        <div className="space-y-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt={prompt} className="max-h-60 w-auto" />
          <div className="flex flex-wrap gap-3 text-xs font-mono uppercase tracking-wider">
            <button type="button" onClick={() => onUse(url, prompt)} className="text-tile-pink hover:text-tile-teal">
              Використати
            </button>
            {onSave && (
              <button type="button" onClick={() => onSave(url, prompt)} className="text-tile-teal hover:text-white">
                Зберегти в бібліотеку
              </button>
            )}
            <button type="button" onClick={generate} className="text-white/50 hover:text-white">
              ↻ Інший варіант
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
