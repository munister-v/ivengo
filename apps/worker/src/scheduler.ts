import { prisma } from '@ivengo/db'
import { TelegramClient, publishPostToChannel } from '@ivengo/telegram'
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

type ActiveChannel = { id: string; name: string; chatId: string; botToken: string }

/** Resolve which active channels a post targets: its explicit list, or all active when none set. */
function targetsFor(post: { channelIds: unknown }, active: ActiveChannel[]): ActiveChannel[] {
  const ids = Array.isArray(post.channelIds) ? (post.channelIds as string[]) : []
  if (ids.length === 0) return active
  return active.filter((c) => ids.includes(c.id))
}

export async function runSchedulerTick(logger: Logger): Promise<void> {
  const now = new Date()

  const duePosts = await prisma.post.findMany({
    where: { status: 'scheduled', scheduledAt: { lte: now }, telegramMessageId: null },
    include: { poll: true },
  })

  const failedPosts = await prisma.post.findMany({
    where: { status: 'failed', retryCount: { lt: MAX_RETRY } },
    include: { poll: true },
  })

  const allPosts = [...duePosts, ...failedPosts]
  if (allPosts.length === 0) {
    logger.debug('No posts to publish')
    return
  }

  const activeChannels = await prisma.telegramChannel.findMany({ where: { isActive: true } })
  if (activeChannels.length === 0) {
    logger.warn('No active Telegram channel — skipping tick')
    return
  }

  const notifyEvents: NotifyEvent[] = []

  for (const post of allPosts) {
    logger.info({ postId: post.id, status: post.status }, 'Processing post')
    const postLabel = post.title || `${post.type} (${post.id.slice(0, 8)})`

    // Compliance re-check (content-level, channel-independent)
    const compliance = checkCompliance(post.content, post.type)
    await prisma.complianceCheck.create({
      data: { postId: post.id, passed: compliance.passed, flags: compliance.flags as object[] },
    })

    if (!compliance.passed) {
      logger.warn({ postId: post.id, flags: compliance.flags }, 'Compliance failed — rejecting post')
      await prisma.post.update({ where: { id: post.id }, data: { status: 'rejected' } })
      notifyEvents.push({
        kind: 'rejected', postId: post.id, title: postLabel,
        detail: `Compliance: ${compliance.flags.map((f) => f.rule).join(', ')}`,
      })
      continue
    }

    const targets = targetsFor(post, activeChannels)
    if (targets.length === 0) {
      logger.warn({ postId: post.id }, 'No active target channels for post — marking failed')
      await prisma.post.update({
        where: { id: post.id },
        data: { status: 'failed', retryCount: { increment: 1 } },
      })
      notifyEvents.push({ kind: 'error', postId: post.id, title: postLabel, detail: 'Немає активних цільових каналів' })
      continue
    }

    const pollData = post.poll
      ? {
          question: post.poll.question,
          options: (post.poll.options as string[]) ?? [],
          isAnonymous: post.poll.isAnonymous,
          allowsMultipleAnswers: post.poll.allowsMultipleAnswers,
          correctOptionId: post.poll.correctOptionId ?? undefined,
        }
      : null

    const publishable = {
      type: post.type,
      content: post.content,
      imageUrl: post.imageUrl,
      buttons: post.buttons as { text: string; url: string }[] | null,
      poll: pollData,
    }

    let anySuccess = false
    let lastMessageId: string | null = null
    const failedNames: string[] = []
    const okNames: string[] = []

    for (const channel of targets) {
      try {
        const messageId = await publishPostToChannel({ botToken: channel.botToken, chatId: channel.chatId }, publishable)
        anySuccess = true
        lastMessageId = messageId
        okNames.push(channel.name)
        await prisma.publicationLog.create({
          data: {
            postId: post.id, channelId: channel.id,
            action: post.retryCount > 0 ? 'retry' : 'publish',
            status: 'success', telegramMessageId: messageId,
          },
        })
        logger.info({ postId: post.id, channel: channel.name, messageId }, 'Published to channel')
      } catch (err: unknown) {
        const error = err instanceof Error ? err.message : String(err)
        failedNames.push(channel.name)
        await prisma.publicationLog.create({
          data: {
            postId: post.id, channelId: channel.id,
            action: post.retryCount > 0 ? 'retry' : 'publish',
            status: 'error', error,
          },
        })
        logger.error({ postId: post.id, channel: channel.name, error }, 'Failed to publish to channel')
      }
    }

    if (anySuccess) {
      await prisma.post.update({
        where: { id: post.id },
        data: { status: 'published', publishedAt: new Date(), telegramMessageId: lastMessageId },
      })
      notifyEvents.push({
        kind: 'success', postId: post.id, title: postLabel,
        detail: `Канали: ${okNames.join(', ')}${failedNames.length ? ` · ⚠️ не вдалось: ${failedNames.join(', ')}` : ''}`,
      })
    } else {
      await prisma.post.update({
        where: { id: post.id },
        data: { status: 'failed', retryCount: { increment: 1 } },
      })
      notifyEvents.push({
        kind: 'error', postId: post.id, title: postLabel,
        detail: `Спроба ${post.retryCount + 1}/${MAX_RETRY}: усі канали з помилкою (${failedNames.join(', ')})`,
      })
    }
  }

  await notifyAdmin(notifyEvents, logger)
}
