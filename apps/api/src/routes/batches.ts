import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '@ivengo/db'
import { createAdapter } from '@ivengo/generator'
import { authenticate } from '../plugins/auth'

const generateSchema = z.object({
  theme: z.string().min(2).max(200),
  contentType: z.enum([
    'short_post', 'article', 'poll', 'review', 'faq', 'news',
    'responsible_gambling', 'myth_fact', 'user_story', 'urgency_offer', 'engagement_poll',
  ]),
  language: z.enum(['uk', 'ru']).default('uk'),
  tone: z.enum(['neutral', 'engaging', 'educational', 'entertaining', 'serious', 'hype']).default('neutral'),
  count: z.number().int().min(1).max(10).default(3),
  ctaUrl: z.string().url().optional(),
  channelName: z.string().optional(),
})

export async function batchesRoutes(app: FastifyInstance) {
  app.addHook('onRequest', authenticate)

  // POST /api/batches/generate
  app.post('/generate', async (req, reply) => {
    const body = generateSchema.parse(req.body)

    const batch = await prisma.contentBatch.create({
      data: {
        theme: body.theme,
        contentType: body.contentType,
        language: body.language,
        tone: body.tone,
        count: body.count,
        status: 'processing',
      },
    })

    try {
      const adapter = createAdapter()
      const posts = await adapter.generate(body)

      const created = await Promise.all(
        posts.map(async (p) => {
          const post = await prisma.post.create({
            data: {
              title: p.title,
              content: p.content,
              type: body.contentType,
              language: body.language,
              status: 'pending_review',
              batchId: batch.id,
              ctaUrl: p.ctaUrl ?? body.ctaUrl,
              buttons: p.buttons ? (p.buttons as object[]) : undefined,
            },
          })

          if (p.poll) {
            await prisma.poll.create({
              data: {
                postId: post.id,
                question: p.poll.question,
                options: p.poll.options,
                isAnonymous: p.poll.isAnonymous ?? true,
                allowsMultipleAnswers: p.poll.allowsMultipleAnswers ?? false,
                correctOptionId: (p.poll as { correctOptionId?: number }).correctOptionId ?? null,
              },
            })
          }

          return post
        })
      )

      await prisma.contentBatch.update({
        where: { id: batch.id },
        data: { status: 'completed' },
      })

      return reply.status(201).send({ batch, posts: created })
    } catch (err: unknown) {
      const error = err instanceof Error ? err.message : String(err)
      await prisma.contentBatch.update({
        where: { id: batch.id },
        data: { status: 'failed' },
      })
      app.log.error({ batchId: batch.id, error }, 'Batch generation failed')
      return reply.status(500).send({ error })
    }
  })

  // GET /api/batches
  app.get('/', async () => {
    const batches = await prisma.contentBatch.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { _count: { select: { posts: true } } },
    })
    return batches
  })

  // GET /api/batches/:id
  app.get('/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    const batch = await prisma.contentBatch.findUnique({
      where: { id },
      include: { posts: { orderBy: { createdAt: 'desc' } } },
    })
    if (!batch) return reply.status(404).send({ error: 'Not found' })
    return batch
  })
}
