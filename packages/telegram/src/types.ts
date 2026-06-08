export interface TelegramConfig {
  botToken: string
  chatId: string
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

export interface TelegramMessage {
  message_id: number
  chat: { id: number | string }
  date: number
  text?: string
}

export interface TelegramPollMessage {
  message_id: number
  poll?: {
    id: string
    question: string
    options: Array<{ text: string; voter_count: number }>
  }
}
