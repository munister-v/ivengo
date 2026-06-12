'use client'
import { useState } from 'react'
import { api } from '@/lib/api'

const SIZES = {
  square: { width: 512, height: 512, label: '⬛ 1:1' },
  portrait: { width: 512, height: 768, label: '📱 9:16' },
  landscape: { width: 768, height: 512, label: '🖥️ 16:9' },
  wide: { width: 1024, height: 576, label: '🎬 16:9 HD' },
  square_hd: { width: 768, height: 768, label: '⬛ 1:1 HD' },
} as const

const STYLES = {
  default: { label: '✨ За замовчуванням', model: undefined },
  realistic: { label: '📷 Реалістичне фото', model: 'Realistic Vision' },
  anime: { label: '🎨 Аніме / арт', model: 'Anything Diffusion' },
  art: { label: '🖌️ Художнє (Deliberate)', model: 'Deliberate' },
  sdxl: { label: '🌆 SDXL (висока якість)', model: 'AlbedoBase XL (SDXL)' },
} as const

type SizeKey = keyof typeof SIZES
type StyleKey = keyof typeof STYLES

interface ImageGeneratorProps {
  /** Called when the user picks the generated image to use right away. */
  onUse: (url: string, prompt: string) => void
  /** If provided, shows a "Зберегти в бібліотеку" button. */
  onSave?: (url: string, prompt: string) => void
}

/** Free AI image generation panel (AI Horde — no API key, no limits). */
export function ImageGenerator({ onUse, onSave }: ImageGeneratorProps) {
  const [prompt, setPrompt] = useState('')
  const [negativePrompt, setNegativePrompt] = useState('')
  const [size, setSize] = useState<SizeKey>('square')
  const [style, setStyle] = useState<StyleKey>('default')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function generate() {
    if (!prompt.trim()) return
    setLoading(true)
    setError('')
    try {
      const dims = SIZES[size]
      const model = STYLES[style].model
      const res = await api.generateImage({
        prompt,
        width: dims.width,
        height: dims.height,
        negativePrompt: negativePrompt.trim() || undefined,
        model,
      })
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

      <div className="flex flex-wrap items-center gap-2">
        <select value={style} onChange={(e) => setStyle(e.target.value as StyleKey)} className="fld !w-auto text-xs">
          {Object.entries(STYLES).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
        <button type="button" onClick={() => setShowAdvanced((v) => !v)} className="text-xs font-mono uppercase tracking-wider text-white/40 hover:text-white">
          {showAdvanced ? '▲ менше налаштувань' : '▼ більше налаштувань'}
        </button>
      </div>
      {showAdvanced && (
        <input
          value={negativePrompt}
          onChange={(e) => setNegativePrompt(e.target.value)}
          placeholder="Чого уникати (необов'язково): text, watermark, blurry, extra fingers"
          className="fld w-full text-xs"
        />
      )}

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
