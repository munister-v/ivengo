import type { FastifyInstance } from 'fastify'
import { prisma } from '@ivengo/db'
import { authenticate } from '../plugins/auth'

export async function statsRoutes(app: FastifyInstance) {
  app.addHook('onRequest', authenticate)

  app.get('/', async () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const [
      totalPosts,
      byStatus,
      publishedToday,
      failedToday,
      recentActivity,
    ] = await Promise.all([
      prisma.post.count(),
      prisma.post.groupBy({ by: ['status'], _count: true }),
      prisma.post.count({ where: { status: 'published', publishedAt: { gte: today } } }),
      prisma.post.count({ where: { status: 'failed', updatedAt: { gte: today } } }),
      prisma.publicationLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          post: { select: { id: true, title: true, type: true } },
          channel: { select: { name: true } },
        },
      }),
    ])

    const statusMap = byStatus.reduce(
      (acc, row) => ({ ...acc, [row.status]: row._count }),
      {} as Record<string, number>
    )

    return {
      totalPosts,
      byStatus: statusMap,
      publishedToday,
      failedToday,
      recentActivity,
    }
  })
}
