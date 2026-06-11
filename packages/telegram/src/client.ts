import type {
  TelegramConfig,
  TelegramResponse,
  TelegramMessage,
  TelegramPollMessage,
  TelegramChat,
  TelegramChatMember,
  SendMessageOptions,
  SendPhotoOptions,
  SendPollOptions,
  InlineButton,
  CustomEmojiSticker,
} from './types'
import { normalizeChatId } from './chat-id'

function buildReplyMarkup(buttons?: InlineButton[][]) {
  if (!buttons?.length) return undefined
  return {
    inline_keyboard: buttons.map((row) =>
      row.map((btn) => ({
        text: btn.text,
        ...(btn.url ? { url: btn.url } : {}),
        ...(btn.callbackData ? { callback_data: btn.callbackData } : {}),
      }))
    ),
  }
}

/**
 * Telegram rejects a message when the (legacy) Markdown/HTML in it is malformed
 * — unbalanced `*`, a stray `_`, an unclosed `[`, etc. AI-generated copy hits
 * this constantly, and the post then silently fails to publish. Detect that
 * specific class of error so we can transparently retry the send as plain text.
 */
function isParseError(e: unknown): boolean {
  const msg = (e instanceof Error ? e.message : String(e)).toLowerCase()
  return (
    msg.includes("can't parse") ||
    msg.includes('parse entities') ||
    msg.includes('entities') ||
    msg.includes('parse_mode')
  )
}

export class TelegramClient {
  private readonly baseUrl: string
  private readonly chatId: string

  constructor(private readonly config: TelegramConfig) {
    this.baseUrl = `https://api.telegram.org/bot${config.botToken}`
    // Accept @nick, t.me links, bare usernames or numeric ids interchangeably.
    this.chatId = normalizeChatId(config.chatId)
  }

  private async request<T>(method: string, body: Record<string, unknown>): Promise<T> {
    const res = await fetch(`${this.baseUrl}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    const data = (await res.json()) as TelegramResponse<T>

    if (!data.ok) {
      throw new Error(`Telegram API error [${data.error_code}]: ${data.description}`)
    }

    return data.result as T
  }

  async sendMessage(text: string, opts: SendMessageOptions = {}): Promise<TelegramMessage> {
    const base = {
      chat_id: this.chatId,
      text,
      disable_web_page_preview: opts.disableWebPagePreview ?? false,
      ...(opts.buttons ? { reply_markup: buildReplyMarkup(opts.buttons) } : {}),
    }
    try {
      return await this.request<TelegramMessage>('sendMessage', {
        ...base,
        parse_mode: opts.parseMode ?? 'Markdown',
      })
    } catch (e) {
      // Malformed markup → resend as plain text so the post still goes out.
      if (isParseError(e)) return this.request<TelegramMessage>('sendMessage', base)
      throw e
    }
  }

  async sendPhoto(
    photoUrl: string,
    opts: SendPhotoOptions = {}
  ): Promise<TelegramMessage> {
    const base = {
      chat_id: this.chatId,
      photo: photoUrl,
      caption: opts.caption ?? '',
      ...(opts.buttons ? { reply_markup: buildReplyMarkup(opts.buttons) } : {}),
    }
    try {
      return await this.request<TelegramMessage>('sendPhoto', {
        ...base,
        parse_mode: opts.parseMode ?? 'Markdown',
      })
    } catch (e) {
      if (isParseError(e)) return this.request<TelegramMessage>('sendPhoto', base)
      throw e
    }
  }

  async sendPoll(
    question: string,
    options: string[],
    opts: SendPollOptions = {}
  ): Promise<TelegramPollMessage> {
    return this.request<TelegramPollMessage>('sendPoll', {
      chat_id: this.chatId,
      question,
      options,
      is_anonymous: opts.isAnonymous ?? true,
      allows_multiple_answers: opts.allowsMultipleAnswers ?? false,
      ...(opts.correctOptionId !== undefined
        ? { type: 'quiz', correct_option_id: opts.correctOptionId }
        : { type: 'regular' }),
      ...(opts.explanationText ? { explanation: opts.explanationText } : {}),
    })
  }

  async deleteMessage(messageId: number): Promise<boolean> {
    return this.request<boolean>('deleteMessage', {
      chat_id: this.chatId,
      message_id: messageId,
    })
  }

  /**
   * Resolve custom (premium) emoji stickers by their custom_emoji_id. Used to
   * validate ids the admin pastes into the premium-emoji library and to surface
   * the actual base emoji / sticker-set name. Returns up to 200 stickers.
   */
  async getCustomEmojiStickers(customEmojiIds: string[]): Promise<CustomEmojiSticker[]> {
    if (customEmojiIds.length === 0) return []
    return this.request<CustomEmojiSticker[]>('getCustomEmojiStickers', {
      custom_emoji_ids: customEmojiIds.slice(0, 200),
    })
  }

  /** Lightweight connectivity check — calls Telegram's getMe (no chat_id needed). */
  async getMe(): Promise<{ id: number; username?: string; first_name: string }> {
    const res = await fetch(`${this.baseUrl}/getMe`)
    const data = (await res.json()) as TelegramResponse<{ id: number; username?: string; first_name: string }>
    if (!data.ok) {
      throw new Error(`Telegram API error [${data.error_code}]: ${data.description}`)
    }
    return data.result as { id: number; username?: string; first_name: string }
  }

  /** Looks up a chat/channel by id or @username. Used to validate the chat_id during setup. */
  async getChat(): Promise<TelegramChat> {
    const res = await fetch(`${this.baseUrl}/getChat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: this.chatId }),
    })
    const data = (await res.json()) as TelegramResponse<TelegramChat>
    if (!data.ok) {
      throw new Error(`Telegram API error [${data.error_code}]: ${data.description}`)
    }
    return data.result as TelegramChat
  }

  /**
   * One-shot setup check: validates the bot token (getMe), that the chat is
   * reachable (getChat), and whether the bot is an admin that may post there
   * (getChatMember on the bot's own id). Used by the "Перевірити" button so the
   * admin gets a precise reason when a channel won't publish.
   */
  async validateConnection(): Promise<{
    bot: { id: number; username?: string; name: string }
    chat: { id: number | string; title?: string; username?: string; type: string }
    botStatus: TelegramChatMember['status'] | 'unknown'
    canPost: boolean
  }> {
    const me = await this.getMe() // throws on an invalid/revoked token
    const chat = await this.getChat() // throws if the chat can't be found / bot not added
    let botStatus: TelegramChatMember['status'] | 'unknown' = 'unknown'
    let canPost = false
    try {
      const member = await this.getChatMember(me.id)
      botStatus = member.status
      canPost =
        member.can_post_messages ??
        (member.status === 'creator' || member.status === 'administrator')
    } catch {
      // getChatMember can fail on some chat types — leave status unknown.
    }
    return {
      bot: { id: me.id, username: me.username, name: me.first_name },
      chat: { id: chat.id, title: chat.title, username: chat.username, type: chat.type },
      botStatus,
      canPost,
    }
  }

  /** Checks the membership/admin status of a user (e.g. the bot itself) in the chat. */
  async getChatMember(userId: number): Promise<TelegramChatMember> {
    const res = await fetch(`${this.baseUrl}/getChatMember`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: this.chatId, user_id: userId }),
    })
    const data = (await res.json()) as TelegramResponse<TelegramChatMember>
    if (!data.ok) {
      throw new Error(`Telegram API error [${data.error_code}]: ${data.description}`)
    }
    return data.result as TelegramChatMember
  }
}
