export interface TelegramConfig {
  botToken: string
  chatId: string
  /** When the channel's bot/admin has Telegram Premium, custom emoji placeholders
   *  in post content are rendered as real `<tg-emoji>` premium emoji. */
  premiumEmoji?: boolean
}

/** A custom (premium) emoji sticker as returned by getCustomEmojiStickers. */
export interface CustomEmojiSticker {
  custom_emoji_id: string
  emoji: string
  set_name?: string
  is_animated?: boolean
  is_video?: boolean
}

export interface InlineButton {
  text: string
  url?: string
  callbackData?: string
}

export interface SendMessageOptions {
  parseMode?: 'Markdown' | 'HTML' | 'MarkdownV2'
  disableWebPagePreview?: boolean
  buttons?: InlineButton[][]
}

export interface SendPhotoOptions {
  caption?: string
  parseMode?: 'Markdown' | 'HTML' | 'MarkdownV2'
  buttons?: InlineButton[][]
}

export interface SendPollOptions {
  isAnonymous?: boolean
  allowsMultipleAnswers?: boolean
  correctOptionId?: number
  explanationText?: string
}

export interface TelegramResponse<T = unknown> {
  ok: boolean
  result?: T
  description?: string
  error_code?: number
}

export interface MessageEntity {
  type: string
  offset: number
  length: number
  custom_emoji_id?: string
  url?: string
}

export interface TelegramMessage {
  message_id: number
  chat: { id: number | string }
  date: number
  text?: string
}

export interface TelegramChat {
  id: number | string
  title?: string
  username?: string
  type: string
}

export interface TelegramChatMember {
  status: 'creator' | 'administrator' | 'member' | 'restricted' | 'left' | 'kicked'
  can_post_messages?: boolean
}

export interface TelegramPollMessage {
  message_id: number
  poll?: {
    id: string
    question: string
    options: Array<{ text: string; voter_count: number }>
  }
}
