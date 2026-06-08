import type { FastifyInstance } from 'fastify'
import { prisma } from '@ivengo/db'
import { authenticate } from '../plugins/auth'

export async function logsRoutes(app: FastifyInstance) {
  app.addHook('onRequest', authenticate)

  app.get('/', async (req) => {
    const { status, page = '1', limit = '50' } = req.query as Record<string, string>
    const where: Record<string, unknown> = {}
    if (status) where.status = status

    const [logs, total] = await Promise.all([
      prisma.publicationLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
        include: {
          post: { select: { id: true, title: true, type: true, content: true } },
          channel: { select: { id: true, name: true, chatId: true } },
        },
      }),
      prisma.publicationLog.count({ where }),
    ])

    return { logs, total, page: Number(page), limit: Number(limit) }
  })
}
