import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '@ivengo/db'
import { checkCompliance } from '@ivengo/compliance'
import { publishPostToChannel } from '@ivengo/telegram'
import { createAdapter } from '@ivengo/generator'
import { authenticate } from '../plugins/auth'

const ALL_TYPES = [
  'short_post', 'article', 'poll', 'review', 'faq', 'news',
  'responsible_gambling', 'myth_fact', 'user_story', 'urgency_offer', 'engagement_poll',
] as const

const buttonSchema = z.object({ text: z.string(), url: z.string().url() })

const pollSchema = z.object({
  question: z.string().min(1),
  options: z.array(z.string().min(1)).min(2),
  isAnonymous: z.boolean().optional(),
  allowsMultipleAnswers: z.boolean().optional(),
  correctOptionId: z.number().int().optional(),
})

const createPostSchema = z.object({
  title: z.string().optional(),
  content: z.string().min(1).max(4096),
  type: z.enum(ALL_TYPES),
  language: z.enum(['uk', 'ru']).default('uk'),
  status: z.enum(['draft', 'pending_review', 'approved', 'scheduled', 'rejected']).optional(),
  scheduledAt: z.string().datetime().optional(),
  imageUrl: z.string().url().optional(),
  ctaUrl: z.string().url().optional(),
  buttons: z.array(buttonSchema).optional(),
  poll: pollSchema.optional(),
  abGroupId: z.string().optional(),
  abVariant: z.string().optional(),
  channelIds: z.array(z.string()).optional(), // target channels; empty/omitted = all active
})

const updatePostSchema = createPostSchema.partial().extend({
  status: z.enum(['draft', 'pending_review', 'approved', 'scheduled', 'rejected']).optional(),
})

const rewriteSchema = z.object({
  text: z.string().min(2, 'Немає тексту для покращення').max(8000),
  instruction: z.string().min(2).max(400),
  language: z.enum(['uk', 'ru']).default('uk'),
})

export async function postsRoutes(app: FastifyInstance) {
  app.addHook('onRequest', authenticate)

  // POST /api/posts/rewrite — AI text transform (improve / shorten / translate / …)
  // Operates on raw text (not a saved post) so it works on unsaved edits too.
  // Goes through the same bulletproof auto-switcher as generation.
  app.post('/rewrite', async (req, reply) => {
    const body = rewriteSchema.parse(req.body)
    try {
      const adapter = createAdapter()
      const text = await adapter.rewrite(body)
      return { text }
    } catch (e) {
      app.log.error({ err: e }, 'AI rewrite failed')
      return reply.status(502).send({ error: e instanceof Error ? e.message : 'AI rewrite failed' })
    }
  })

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

  // GET /api/posts/calendar?from=ISO&to=ISO — posts scheduled or published in a date range
  app.get('/calendar', async (req) => {
    const { from, to } = req.query as Record<string, string>
    const range = from && to ? { gte: new Date(from), lte: new Date(to) } : undefined

    const posts = await prisma.post.findMany({
      where: {
        OR: [
          ...(range ? [{ scheduledAt: range }, { publishedAt: range }] : []),
        ],
      },
      orderBy: [{ scheduledAt: 'asc' }, { publishedAt: 'asc' }],
      select: {
        id: true,
        title: true,
        type: true,
        status: true,
        language: true,
        scheduledAt: true,
        publishedAt: true,
      },
      take: 500,
    })

    return { posts }
  })

  // GET /api/posts/ab-groups — A/B test groups with both variants and their stats
  app.get('/ab-groups', async () => {
    const posts = await prisma.post.findMany({
      where: { abGroupId: { not: null } },
      orderBy: [{ abGroupId: 'asc' }, { abVariant: 'asc' }],
      include: {
        publicationLogs: { where: { status: 'success' }, select: { id: true } },
      },
    })

    const groups = new Map<string, typeof posts>()
    for (const p of posts) {
      const key = p.abGroupId as string
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key)!.push(p)
    }

    return {
      groups: Array.from(groups.entries()).map(([abGroupId, items]) => ({
        abGroupId,
        variants: items.map((p) => ({
          id: p.id,
          title: p.title,
          type: p.type,
          status: p.status,
          abVariant: p.abVariant,
          scheduledAt: p.scheduledAt,
          publishedAt: p.publishedAt,
          publishCount: p.publicationLogs.length,
        })),
      })),
    }
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
    const { poll, ...body } = createPostSchema.parse(req.body)
    let post = await prisma.post.create({
      data: {
        ...body,
        ...(poll ? { poll: { create: poll } } : {}),
      },
      include: { poll: true },
    })
    // Default the A/B group to this post's own id when a variant is set without an explicit group
    if (post.abVariant && !post.abGroupId) {
      post = await prisma.post.update({
        where: { id: post.id },
        data: { abGroupId: post.id },
        include: { poll: true },
      })
    }
    return reply.status(201).send(post)
  })

  // PATCH /api/posts/:id
  app.patch('/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    // `poll` is a nested relation, not a scalar column — it can't be written
    // through a plain update, and the editor doesn't send it here. Drop it.
    const { poll: _poll, ...body } = updatePostSchema.parse(req.body)
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

  // POST /api/posts/:id/publish — publishes to the post's target channels
  // (or all active channels when none are set). Succeeds if ≥1 channel sends.
  app.post('/:id/publish', async (req, reply) => {
    const { id } = req.params as { id: string }
    const post = await prisma.post.findUnique({ where: { id }, include: { poll: true } })
    if (!post) return reply.status(404).send({ error: 'Not found' })

    const active = await prisma.telegramChannel.findMany({ where: { isActive: true } })
    if (active.length === 0) return reply.status(503).send({ error: 'No active Telegram channel configured' })

    const targetIds = Array.isArray(post.channelIds) ? (post.channelIds as string[]) : []
    const channels = targetIds.length ? active.filter((c) => targetIds.includes(c.id)) : active
    if (channels.length === 0) return reply.status(503).send({ error: 'No active target channels for this post' })

    const compliance = checkCompliance(post.content, post.type)
    await prisma.complianceCheck.create({
      data: { postId: id, passed: compliance.passed, flags: compliance.flags as object[] },
    })
    if (!compliance.passed) {
      return reply.status(422).send({ error: 'Compliance check failed', flags: compliance.flags })
    }

    const publishable = {
      type: post.type,
      content: post.content,
      imageUrl: post.imageUrl,
      buttons: post.buttons as { text: string; url: string }[] | null,
      poll: post.poll
        ? {
            question: post.poll.question,
            options: (post.poll.options as string[]) ?? [],
            isAnonymous: post.poll.isAnonymous,
            allowsMultipleAnswers: post.poll.allowsMultipleAnswers,
            correctOptionId: post.poll.correctOptionId ?? undefined,
          }
        : null,
    }

    const results: { channel: string; ok: boolean; messageId?: string; error?: string }[] = []
    let lastMessageId: string | null = null

    for (const channel of channels) {
      try {
        const messageId = await publishPostToChannel(
          { botToken: channel.botToken, chatId: channel.chatId, premiumEmoji: channel.premiumEmoji },
          publishable,
        )
        lastMessageId = messageId
        results.push({ channel: channel.name, ok: true, messageId })
        await prisma.publicationLog.create({
          data: { postId: id, channelId: channel.id, action: 'publish', status: 'success', telegramMessageId: messageId },
        })
      } catch (err: unknown) {
        const error = err instanceof Error ? err.message : String(err)
        results.push({ channel: channel.name, ok: false, error })
        await prisma.publicationLog.create({
          data: { postId: id, channelId: channel.id, action: 'publish', status: 'error', error },
        })
      }
    }

    const anyOk = results.some((r) => r.ok)
    await prisma.post.update({
      where: { id },
      data: anyOk
        ? { status: 'published', publishedAt: new Date(), telegramMessageId: lastMessageId }
        : { status: 'failed' },
    })

    if (!anyOk) {
      return reply.status(500).send({ error: 'Усі канали з помилкою', results })
    }
    return { success: true, telegramMessageId: lastMessageId, results }
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
