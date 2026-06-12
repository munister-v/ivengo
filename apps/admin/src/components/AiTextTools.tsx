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
  { key: 'improve', label: '✨ Покращити', instruction: () => 'Rewrite this post to be more engaging, vivid and persuasive while keeping the same meaning, length and all links.' },
  { key: 'shorter', label: '✂️ Коротше', instruction: () => 'Make this post noticeably shorter and punchier (cut ~30-40%) while keeping the key hook, the offer and the call to action.' },
  { key: 'longer', label: '📝 Детальніше', instruction: () => 'Expand this post with one or two extra vivid details/benefits, keeping it natural and not over-long.' },
  { key: 'emoji', label: '😀 Більше емодзі', instruction: () => 'Add tasteful, relevant emoji to make the post more lively for Telegram. Do not overdo it — keep it readable.' },
  { key: 'cta', label: '🎯 Сильніший заклик', instruction: () => 'Strengthen the call to action at the end so it feels more urgent and clickable, keeping any existing link.' },
  { key: 'variant', label: '🔁 Інший варіант', instruction: () => 'Rewrite this post from a fresh angle with different wording and structure, same topic and offer.' },
  { key: 'hashtags', label: '#️⃣ Хештеги', instruction: () => 'Append 3-5 relevant Telegram hashtags on a new line at the very end. Keep the rest of the post unchanged.' },
  { key: 'translate', label: '🌐 Переклад', instruction: (lang) => (lang === 'uk'
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
        report('Готово ✨ — текст оновлено')
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
    <div className="bg-white/5 p-3 space-y-2 rounded">
      <p className="eyebrow !text-white/40">🤖 AI-помічник тексту</p>
      <div className="flex flex-wrap gap-2">
        {TOOLS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => run(t.key, t.instruction(language))}
            disabled={!!busy}
            className="text-xs font-medium px-3 py-1.5 bg-white/10 hover:bg-tile-blue hover:text-white text-white/80 transition-colors disabled:opacity-40"
          >
            {busy === t.key ? '⏳ AI...' : t.label}
          </button>
        ))}
        {prev != null && (
          <button
            type="button"
            onClick={undo}
            disabled={!!busy}
            className="text-xs font-medium px-3 py-1.5 bg-tile-rose/80 hover:bg-tile-rose text-white transition-colors disabled:opacity-40"
          >
            ↩ Відмінити
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
          {busy === 'custom' ? '⏳' : 'Застосувати'}
        </button>
      </div>

      {localMsg && <p className="text-xs text-white/60">{localMsg}</p>}
    </div>
  )
}
