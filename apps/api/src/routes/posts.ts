import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '@ivengo/db'
import { checkCompliance } from '@ivengo/compliance'
import { TelegramClient } from '@ivengo/telegram'
import { authenticate } from '../plugins/auth'

const createPostSchema = z.object({
  title: z.string().optional(),
  content: z.string().min(1).max(4096),
  type: z.enum([
    'short_post', 'article', 'poll', 'review',
    'faq', 'news', 'responsible_gambling', 'myth_fact',
  ]),
  language: z.enum(['uk', 'ru']).default('uk'),
  scheduledAt: z.string().datetime().optional(),
  imageUrl: z.string().url().optional(),
})

const updatePostSchema = createPostSchema.partial().extend({
  status: z.enum(['draft', 'pending_review', 'approved', 'scheduled', 'rejected']).optional(),
})

export async function postsRoutes(app: FastifyInstance) {
  app.addHook('onRequest', authenticate)

  // GET /api/posts
  app.get('/', async (req) => {
    const { status, type, language, page = '1', limit = '20' } = req.query as Record<string, string>
    const where: Record<string, unknown> = {}
    if (status) where.status = status
    if (type) where.type = type
    if (language) where.language = language

    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
        include: {
          poll: true,
          complianceChecks: { orderBy: { checkedAt: 'desc' }, take: 1 },
        },
      }),
      prisma.post.count({ where }),
    ])

    return { posts, total, page: Number(page), limit: Number(limit) }
  })

  // GET /api/posts/:id
  app.get('/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    const post = await prisma.post.findUnique({
      where: { id },
      include: {
        poll: true,
        complianceChecks: { orderBy: { checkedAt: 'desc' }, take: 5 },
        publicationLogs: { orderBy: { createdAt: 'desc' }, take: 10, include: { channel: true } },
        source: true,
        batch: true,
      },
    })
    if (!post) return reply.status(404).send({ error: 'Post not found' })
    return post
  })

  // POST /api/posts
  app.post('/', async (req, reply) => {
    const body = createPostSchema.parse(req.body)
    const post = await prisma.post.create({ data: body })
    return reply.status(201).send(post)
  })

  // PATCH /api/posts/:id
  app.patch('/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    const body = updatePostSchema.parse(req.body)
    const post = await prisma.post.update({ where: { id }, data: body })
    return post
  })

  // POST /api/posts/:id/approve
  app.post('/:id/approve', async (req, reply) => {
    const { id } = req.params as { id: string }
    const post = await prisma.post.findUnique({ where: { id } })
    if (!post) return reply.status(404).send({ error: 'Not found' })

    const compliance = checkCompliance(post.content, post.type)
    await prisma.complianceCheck.create({
      data: { postId: id, passed: compliance.passed, flags: compliance.flags as object[] },
    })

    if (!compliance.passed) {
      return reply.status(422).send({
        error: 'Compliance check failed',
        flags: compliance.flags,
      })
    }

    const updated = await prisma.post.update({
      where: { id },
      data: { status: 'approved' },
    })
    return updated
  })

  // POST /api/posts/:id/reject
  app.post('/:id/reject', async (req, reply) => {
    const { id } = req.params as { id: string }
    const { reason } = (req.body as { reason?: string }) || {}
    const post = await prisma.post.update({
      where: { id },
      data: { status: 'rejected' },
    })
    app.log.info({ postId: id, reason }, 'Post rejected')
    return post
  })

  // POST /api/posts/:id/schedule
  app.post('/:id/schedule', async (req, reply) => {
    const { id } = req.params as { id: string }
    const { scheduledAt } = req.body as { scheduledAt: string }
    if (!scheduledAt) return reply.status(400).send({ error: 'scheduledAt required' })

    const post = await prisma.post.update({
      where: { id },
      data: { status: 'scheduled', scheduledAt: new Date(scheduledAt) },
    })
    return post
  })

  // POST /api/posts/:id/publish
  app.post('/:id/publish', async (req, reply) => {
    const { id } = req.params as { id: string }
    const post = await prisma.post.findUnique({ where: { id }, include: { poll: true } })
    if (!post) return reply.status(404).send({ error: 'Not found' })

    const channel = await prisma.telegramChannel.findFirst({ where: { isActive: true } })
    if (!channel) return reply.status(503).send({ error: 'No active Telegram channel configured' })

    const compliance = checkCompliance(post.content, post.type)
    await prisma.complianceCheck.create({
      data: { postId: id, passed: compliance.passed, flags: compliance.flags as object[] },
    })

    if (!compliance.passed) {
      return reply.status(422).send({ error: 'Compliance check failed', flags: compliance.flags })
    }

    const client = new TelegramClient({ botToken: channel.botToken, chatId: channel.chatId })

    let telegramMessageId: string | null = null
    try {
      if (post.type === 'poll' && post.poll) {
        const pollData = post.poll
        const options = (pollData.options as string[]) ?? []
        const msg = await client.sendPoll(pollData.question, options, {
          isAnonymous: pollData.isAnonymous,
          allowsMultipleAnswers: pollData.allowsMultipleAnswers,
          correctOptionId: pollData.correctOptionId ?? undefined,
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
        where: { id },
        data: { status: 'published', publishedAt: new Date(), telegramMessageId },
      })

      await prisma.publicationLog.create({
        data: {
          postId: id,
          channelId: channel.id,
          action: 'publish',
          status: 'success',
          telegramMessageId,
        },
      })

      return { success: true, telegramMessageId }
    } catch (err: unknown) {
      const error = err instanceof Error ? err.message : String(err)
      await prisma.post.update({ where: { id }, data: { status: 'failed' } })
      await prisma.publicationLog.create({
        data: { postId: id, channelId: channel.id, action: 'publish', status: 'error', error },
      })
      return reply.status(500).send({ error })
    }
  })

  // POST /api/posts/:id/compliance
  app.post('/:id/compliance', async (req, reply) => {
    const { id } = req.params as { id: string }
    const post = await prisma.post.findUnique({ where: { id } })
    if (!post) return reply.status(404).send({ error: 'Not found' })

    const result = checkCompliance(post.content, post.type)
    await prisma.complianceCheck.create({
      data: { postId: id, passed: result.passed, flags: result.flags as object[] },
    })
    return result
  })

  // DELETE /api/posts/:id
  app.delete('/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    await prisma.post.delete({ where: { id } })
    return reply.status(204).send()
  })
}
