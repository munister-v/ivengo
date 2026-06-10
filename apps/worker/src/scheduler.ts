import { prisma } from '@ivengo/db'
import { TelegramClient } from '@ivengo/telegram'
import { checkCompliance } from '@ivengo/compliance'
import type { Logger } from 'pino'

const MAX_RETRY = Number(process.env.MAX_RETRY_COUNT) || 3

interface NotifyEvent {
  kind: 'success' | 'error' | 'rejected'
  postId: string
  title: string
  detail?: string
}

async function notifyAdmin(events: NotifyEvent[], logger: Logger): Promise<void> {
  const token = process.env.ADMIN_NOTIFY_BOT_TOKEN
  const chatId = process.env.ADMIN_NOTIFY_CHAT_ID
  if (!token || !chatId || events.length === 0) return

  const lines = events.map((e) => {
    const icon = e.kind === 'success' ? '✅' : e.kind === 'rejected' ? '🚫' : '⚠️'
    let line = `${icon} ${e.title}`
    if (e.detail) line += `\n   ${e.detail}`
    return line
  })

  const text = `🤖 *Ivengo: оновлення публікацій*\n\n${lines.join('\n')}`

  try {
    const client = new TelegramClient({ botToken: token, chatId })
    await client.sendMessage(text)
  } catch (err) {
    logger.error({ err }, 'Failed to send admin notification')
  }
}

export async function runSchedulerTick(logger: Logger): Promise<void> {
  const now = new Date()

  // Find posts that are scheduled and due
  const duePosts = await prisma.post.findMany({
    where: {
      status: 'scheduled',
      scheduledAt: { lte: now },
      telegramMessageId: null,
    },
    include: { poll: true },
  })

  // Also retry failed posts (up to MAX_RETRY)
  const failedPosts = await prisma.post.findMany({
    where: {
      status: 'failed',
      retryCount: { lt: MAX_RETRY },
    },
    include: { poll: true },
  })

  const allPosts = [...duePosts, ...failedPosts]

  if (allPosts.length === 0) {
    logger.debug('No posts to publish')
    return
  }

  const channel = await prisma.telegramChannel.findFirst({ where: { isActive: true } })
  if (!channel) {
    logger.warn('No active Telegram channel — skipping tick')
    return
  }

  const client = new TelegramClient({ botToken: channel.botToken, chatId: channel.chatId })
  const notifyEvents: NotifyEvent[] = []

  for (const post of allPosts) {
    logger.info({ postId: post.id, status: post.status }, 'Processing post')
    const postLabel = post.title || `${post.type} (${post.id.slice(0, 8)})`

    // Compliance re-check before publishing
    const compliance = checkCompliance(post.content, post.type)
    await prisma.complianceCheck.create({
      data: { postId: post.id, passed: compliance.passed, flags: compliance.flags as object[] },
    })

    if (!compliance.passed) {
      logger.warn({ postId: post.id, flags: compliance.flags }, 'Compliance failed — rejecting post')
      await prisma.post.update({ where: { id: post.id }, data: { status: 'rejected' } })
      await prisma.publicationLog.create({
        data: {
          postId: post.id,
          channelId: channel.id,
          action: 'publish',
          status: 'error',
          error: `Compliance: ${compliance.flags.map((f) => f.rule).join(', ')}`,
        },
      })
      notifyEvents.push({
        kind: 'rejected',
        postId: post.id,
        title: postLabel,
        detail: `Compliance: ${compliance.flags.map((f) => f.rule).join(', ')}`,
      })
      continue
    }

    type RawButton = { text: string; url: string }
    const rawButtons = post.buttons as RawButton[] | null
    const inlineButtons = rawButtons?.length
      ? [rawButtons.map((b) => ({ text: b.text, url: b.url }))]
      : undefined

    let telegramMessageId: string | null = null
    try {
      if ((post.type === 'poll' || post.type === 'engagement_poll') && post.poll) {
        const options = (post.poll.options as string[]) ?? []
        const msg = await client.sendPoll(post.poll.question, options, {
          isAnonymous: post.poll.isAnonymous,
          allowsMultipleAnswers: post.poll.allowsMultipleAnswers,
          correctOptionId: post.poll.correctOptionId ?? undefined,
        })
        telegramMessageId = String(msg.message_id)
      } else if (post.imageUrl) {
        const msg = await client.sendPhoto(post.imageUrl, {
          caption: post.content,
          buttons: inlineButtons,
        })
        telegramMessageId = String(msg.message_id)
      } else {
        const msg = await client.sendMessage(post.content, { buttons: inlineButtons })
        telegramMessageId = String(msg.message_id)
      }

      await prisma.post.update({
        where: { id: post.id },
        data: { status: 'published', publishedAt: new Date(), telegramMessageId },
      })

      await prisma.publicationLog.create({
        data: {
          postId: post.id,
          channelId: channel.id,
          action: post.retryCount > 0 ? 'retry' : 'publish',
          status: 'success',
          telegramMessageId,
        },
      })

      logger.info({ postId: post.id, telegramMessageId }, 'Post published successfully')
      notifyEvents.push({ kind: 'success', postId: post.id, title: postLabel, detail: `Канал: ${channel.name}` })
    } catch (err: unknown) {
      const error = err instanceof Error ? err.message : String(err)
      logger.error({ postId: post.id, error }, 'Failed to publish post')

      await prisma.post.update({
        where: { id: post.id },
        data: { status: 'failed', retryCount: { increment: 1 } },
      })

      await prisma.publicationLog.create({
        data: {
          postId: post.id,
          channelId: channel.id,
          action: post.retryCount > 0 ? 'retry' : 'publish',
          status: 'error',
          error,
        },
      })
      notifyEvents.push({
        kind: 'error',
        postId: post.id,
        title: postLabel,
        detail: `Спроба ${post.retryCount + 1}/${MAX_RETRY}: ${error}`,
      })
    }
  }

  await notifyAdmin(notifyEvents, logger)
}
