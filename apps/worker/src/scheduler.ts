import { prisma } from '@ivengo/db'
import { TelegramClient } from '@ivengo/telegram'
import { checkCompliance } from '@ivengo/compliance'
import type { Logger } from 'pino'

const MAX_RETRY = Number(process.env.MAX_RETRY_COUNT) || 3

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

  for (const post of allPosts) {
    logger.info({ postId: post.id, status: post.status }, 'Processing post')

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
      continue
    }

    let telegramMessageId: string | null = null
    try {
      if (post.type === 'poll' && post.poll) {
        const options = (post.poll.options as string[]) ?? []
        const msg = await client.sendPoll(post.poll.question, options, {
          isAnonymous: post.poll.isAnonymous,
          allowsMultipleAnswers: post.poll.allowsMultipleAnswers,
          correctOptionId: post.poll.correctOptionId ?? undefined,
        })
        telegramMessageId = String(msg.message_id)
      } else if (post.imageUrl) {
        const msg = await client.sendPhoto(post.imageUrl, { caption: post.content })
        telegramMessageId = String(msg.message_id)
      } else {
        const msg = await client.sendMessage(post.content)
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
    }
  }
}
