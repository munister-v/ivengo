'use client'
import { useState } from 'react'
import { api } from '@/lib/api'

interface AiTextToolsProps {
  /** Current post text. */
  text: string
  /** Post language — drives translation target and output language. */
  language: 'uk' | 'ru'
  /** Called with the AI-rewritten text. */
  onResult: (text: string) => void
  /** Optional error/success reporter (falls back to a local inline message). */
  notify?: (msg: string, type?: 'success' | 'error') => void
}

interface Tool {
  key: string
  label: string
  instruction: (lang: 'uk' | 'ru') => string
}

// Quick one-tap transforms. Instructions are in English (models follow them
// best) but always force the output language back to the post's language.
const TOOLS: Tool[] = [
  { key: 'improve', label: 'Покращити', instruction: () => 'Rewrite this post to be more engaging, vivid and persuasive while keeping the same meaning, length and all links.' },
  { key: 'shorter', label: 'Коротше', instruction: () => 'Make this post noticeably shorter and punchier (cut ~30-40%) while keeping the key hook, the offer and the call to action.' },
  { key: 'longer', label: 'Детальніше', instruction: () => 'Expand this post with one or two extra vivid details/benefits, keeping it natural and not over-long.' },
  { key: 'emoji', label: 'Додати емодзі', instruction: () => 'Add tasteful, relevant emoji to make the post more lively for Telegram. Do not overdo it — keep it readable.' },
  { key: 'cta', label: 'Посилити CTA', instruction: () => 'Strengthen the call to action at the end so it feels more urgent and clickable, keeping any existing link.' },
  { key: 'variant', label: 'Інший варіант', instruction: () => 'Rewrite this post from a fresh angle with different wording and structure, same topic and offer.' },
  { key: 'hashtags', label: 'Хештеги', instruction: () => 'Append 3-5 relevant Telegram hashtags on a new line at the very end. Keep the rest of the post unchanged.' },
  { key: 'translate', label: 'Переклад', instruction: (lang) => (lang === 'uk'
    ? 'Translate this whole post into Russian, keeping all Markdown formatting, emoji and links.'
    : 'Translate this whole post into Ukrainian, keeping all Markdown formatting, emoji and links.') },
]

/**
 * Inline AI toolbar for transforming post text (improve / shorten / expand /
 * translate / …). Each action goes through the bulletproof auto-switcher on the
 * backend and replaces the text via onResult, with one-level undo.
 */
export function AiTextTools({ text, language, onResult, notify }: AiTextToolsProps) {
  const [busy, setBusy] = useState('')
  const [prev, setPrev] = useState<string | null>(null)
  const [custom, setCustom] = useState('')
  const [localMsg, setLocalMsg] = useState('')

  function report(msg: string, type: 'success' | 'error' = 'success') {
    if (notify) notify(msg, type)
    else setLocalMsg(msg)
  }

  async function run(toolKey: string, instruction: string) {
    if (!text.trim()) {
      report('Спочатку має бути текст посту', 'error')
      return
    }
    setBusy(toolKey)
    setLocalMsg('')
    const before = text
    try {
      const res = await api.rewriteText({ text, instruction, language })
      if (res.text && res.text.trim() && res.text.trim() !== before.trim()) {
        setPrev(before)
        onResult(res.text.trim())
        report('Текст оновлено')
      } else {
        report('AI повернув той самий текст — спробуйте інший варіант', 'error')
      }
    } catch (e: unknown) {
      report(e instanceof Error ? e.message : 'Помилка AI', 'error')
    } finally {
      setBusy('')
    }
  }

  function undo() {
    if (prev == null) return
    onResult(prev)
    setPrev(null)
    report('Відкочено до попереднього тексту')
  }

  return (
    <div className="space-y-3 border border-tile-coal/20 bg-tile-amber/45 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="eyebrow">AI text desk</p>
          <p className="mt-1 text-sm text-tile-coal/55">Перепишіть текст одним редакційним рухом.</p>
        </div>
        {busy && <span className="font-mono text-[9px] uppercase tracking-wider text-tile-coal/45">Processing</span>}
      </div>
      <div className="flex flex-wrap gap-2">
        {TOOLS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => run(t.key, t.instruction(language))}
            disabled={!!busy}
            className="border border-tile-coal/25 bg-[#fffdf9] px-3 py-2 font-mono text-[9px] uppercase tracking-[0.12em] text-tile-coal transition-colors hover:bg-tile-coal hover:text-tile-amber disabled:opacity-40"
          >
            {busy === t.key ? 'AI…' : t.label}
          </button>
        ))}
        {prev != null && (
          <button
            type="button"
            onClick={undo}
            disabled={!!busy}
            className="border border-tile-rose px-3 py-2 font-mono text-[9px] uppercase tracking-[0.12em] text-tile-rose transition-colors hover:bg-tile-rose hover:text-white disabled:opacity-40"
          >
            Відмінити
          </button>
        )}
      </div>

      <div className="flex gap-2">
        <input
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && custom.trim() && !busy) {
              e.preventDefault()
              run('custom', custom.trim())
            }
          }}
          placeholder="Своя інструкція: напр. «додай інтригу про джекпот»"
          className="fld flex-1 text-xs"
        />
        <button
          type="button"
          onClick={() => custom.trim() && run('custom', custom.trim())}
          disabled={!!busy || !custom.trim()}
          className="btn-line whitespace-nowrap text-xs"
        >
          {busy === 'custom' ? 'AI…' : 'Застосувати'}
        </button>
      </div>

      {localMsg && <p className="text-xs text-tile-coal/60">{localMsg}</p>}
    </div>
  )
}
