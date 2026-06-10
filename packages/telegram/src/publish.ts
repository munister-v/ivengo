import { TelegramClient } from './client'
import type { TelegramConfig } from './types'

/**
 * Minimal post shape needed to publish to Telegram — decoupled from the
 * Prisma model so both the API publish route and the worker scheduler can
 * share one implementation instead of duplicating the poll/photo/message logic.
 */
export interface PublishablePost {
  type: string
  content: string
  imageUrl?: string | null
  buttons?: { text: string; url: string }[] | null
  poll?: {
    question: string
    options: string[]
    isAnonymous?: boolean
    allowsMultipleAnswers?: boolean
    correctOptionId?: number | null
  } | null
}

/** Send one post to one channel. Returns the Telegram message id as a string. */
export async function publishPostToChannel(config: TelegramConfig, post: PublishablePost): Promise<string> {
  const client = new TelegramClient(config)

  const buttons = post.buttons?.length
    ? [post.buttons.map((b) => ({ text: b.text, url: b.url }))]
    : undefined

  if ((post.type === 'poll' || post.type === 'engagement_poll') && post.poll) {
    const msg = await client.sendPoll(post.poll.question, post.poll.options, {
      isAnonymous: post.poll.isAnonymous,
      allowsMultipleAnswers: post.poll.allowsMultipleAnswers,
      correctOptionId: post.poll.correctOptionId ?? undefined,
    })
    return String(msg.message_id)
  }

  if (post.imageUrl) {
    const msg = await client.sendPhoto(post.imageUrl, { caption: post.content, buttons })
    return String(msg.message_id)
  }

  const msg = await client.sendMessage(post.content, { buttons })
  return String(msg.message_id)
}
