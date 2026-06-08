import type {
  TelegramConfig,
  TelegramResponse,
  TelegramMessage,
  TelegramPollMessage,
  SendMessageOptions,
  SendPhotoOptions,
  SendPollOptions,
  InlineButton,
} from './types'

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

export class TelegramClient {
  private readonly baseUrl: string

  constructor(private readonly config: TelegramConfig) {
    this.baseUrl = `https://api.telegram.org/bot${config.botToken}`
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
    return this.request<TelegramMessage>('sendMessage', {
      chat_id: this.config.chatId,
      text,
      parse_mode: opts.parseMode ?? 'Markdown',
      disable_web_page_preview: opts.disableWebPagePreview ?? false,
      ...(opts.buttons ? { reply_markup: buildReplyMarkup(opts.buttons) } : {}),
    })
  }

  async sendPhoto(
    photoUrl: string,
    opts: SendPhotoOptions = {}
  ): Promise<TelegramMessage> {
    return this.request<TelegramMessage>('sendPhoto', {
      chat_id: this.config.chatId,
      photo: photoUrl,
      caption: opts.caption ?? '',
      parse_mode: opts.parseMode ?? 'Markdown',
      ...(opts.buttons ? { reply_markup: buildReplyMarkup(opts.buttons) } : {}),
    })
  }

  async sendPoll(
    question: string,
    options: string[],
    opts: SendPollOptions = {}
  ): Promise<TelegramPollMessage> {
    return this.request<TelegramPollMessage>('sendPoll', {
      chat_id: this.config.chatId,
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
      chat_id: this.config.chatId,
      message_id: messageId,
    })
  }
}
