/**
 * Normalize whatever the admin pastes into the "chat id" field into a value the
 * Telegram Bot API accepts. People naturally enter a channel in many forms:
 *
 *   @ivengo_slot                         → @ivengo_slot
 *   ivengo_slot                          → @ivengo_slot
 *   https://t.me/ivengo_slot             → @ivengo_slot
 *   t.me/ivengo_slot                     → @ivengo_slot
 *   telegram.me/ivengo_slot              → @ivengo_slot
 *   -1001234567890                       → -1001234567890   (private/super-group id)
 *   https://t.me/+AbCdEf  (invite link)  → left as-is (cannot be used as chat_id)
 *
 * Never throws — best effort. Use `isInviteLink` to surface a friendly error
 * for private invite links, which simply cannot serve as a chat_id (the bot
 * must be made an admin and the numeric -100… id used instead).
 */
export function normalizeChatId(raw: string): string {
  const trimmed = (raw ?? '').trim()
  if (!trimmed) return trimmed

  // Numeric chat id (e.g. -1001234567890 or a user id) — use verbatim.
  if (/^-?\d+$/.test(trimmed)) return trimmed

  // Pull the handle out of a t.me / telegram.me link if present, else use input.
  const linkMatch = trimmed.match(/(?:https?:\/\/)?(?:www\.)?t(?:elegram)?\.me\/([^?#/\s]+)/i)
  const handle = (linkMatch ? linkMatch[1] : trimmed).replace(/^@/, '')

  // Private invite links (t.me/+hash or t.me/joinchat/…) can't be a chat_id.
  if (handle.startsWith('+') || /^joinchat/i.test(handle)) return trimmed

  // A valid public @username (4–32 chars of [A-Za-z0-9_]).
  if (/^[A-Za-z0-9_]{4,32}$/.test(handle)) return '@' + handle

  return trimmed
}

/** True when the value is a private invite link, which cannot be used as a chat_id. */
export function isInviteLink(raw: string): boolean {
  const s = (raw ?? '').trim()
  return /(?:https?:\/\/)?(?:www\.)?t(?:elegram)?\.me\/(?:\+|joinchat\/)/i.test(s) ||
    /^\+/.test(s) ||
    /^joinchat\//i.test(s)
}
