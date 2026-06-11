/**
 * Telegram Premium / custom emoji support.
 *
 * Posts may embed premium custom emoji using a portable placeholder syntax:
 *
 *     [ce:5368324170671202286:🎰]
 *      └┬┘ └────────┬────────┘ └┬┘
 *      tag   custom_emoji_id    unicode fallback (shown to non-premium viewers
 *                                and used when the channel has no premium)
 *
 * At publish time `renderContent` turns those placeholders into either a
 * `<tg-emoji emoji-id="…">…</tg-emoji>` HTML tag (when the channel's bot/admin
 * has Telegram Premium and may send custom emoji) or, otherwise, the plain
 * unicode fallback — so the same stored content works in both cases.
 */

export interface RenderedContent {
  text: string
  parseMode: 'Markdown' | 'HTML'
}

// [ce:<digits>:<fallback>]  — fallback may be empty
const CE_RE = /\[ce:(\d+):([^\]]*)\]/g

/** True when the content embeds at least one custom-emoji placeholder. */
export function hasCustomEmoji(content: string): boolean {
  CE_RE.lastIndex = 0
  return CE_RE.test(content)
}

/** Extract the distinct custom_emoji_ids referenced by the content. */
export function extractCustomEmojiIds(content: string): string[] {
  const ids = new Set<string>()
  CE_RE.lastIndex = 0
  let m: RegExpExecArray | null
  while ((m = CE_RE.exec(content)) !== null) ids.add(m[1])
  return [...ids]
}

/** Replace every placeholder with its plain unicode fallback (premium disabled). */
export function stripCustomEmoji(content: string): string {
  return content.replace(CE_RE, (_m, _id, fb) => fb || '')
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/**
 * Minimal converter for the Telegram-legacy-Markdown subset our generated
 * content uses (`*bold*`, `_italic_`, `` `code` ``, `[text](url)`), producing
 * the equivalent Telegram-HTML. Only used on the premium path, where we must
 * switch the whole message to HTML so `<tg-emoji>` tags are honoured.
 */
function markdownToHtml(src: string): string {
  let s = escapeHtml(src)
  s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, (_m, t, u) => `<a href="${u}">${t}</a>`)
  s = s.replace(/\*([^*\n]+)\*/g, '<b>$1</b>')
  s = s.replace(/(^|[\s(])_([^_\n]+)_/g, (_m, pre, t) => `${pre}<i>${t}</i>`)
  s = s.replace(/`([^`\n]+)`/g, '<code>$1</code>')
  return s
}

/**
 * Render stored content for sending to Telegram.
 *
 * - premium === false (or no placeholders): unchanged Markdown, placeholders
 *   collapsed to their unicode fallback. The default path for every channel
 *   without Telegram Premium — behaviour identical to before this feature.
 * - premium === true with placeholders: HTML output with `<tg-emoji>` tags and
 *   the surrounding text converted from Markdown to HTML.
 */
export function renderContent(content: string, opts: { premium?: boolean } = {}): RenderedContent {
  if (!opts.premium || !hasCustomEmoji(content)) {
    return { text: stripCustomEmoji(content), parseMode: 'Markdown' }
  }

  let out = ''
  let last = 0
  CE_RE.lastIndex = 0
  let m: RegExpExecArray | null
  while ((m = CE_RE.exec(content)) !== null) {
    out += markdownToHtml(content.slice(last, m.index))
    const id = m[1]
    const fallback = m[2] || '⭐️'
    out += `<tg-emoji emoji-id="${id}">${escapeHtml(fallback)}</tg-emoji>`
    last = m.index + m[0].length
  }
  out += markdownToHtml(content.slice(last))
  return { text: out, parseMode: 'HTML' }
}
