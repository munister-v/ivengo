import type { FastifyInstance } from 'fastify'
import { prisma } from '@ivengo/db'
import { authenticate } from '../plugins/auth'

export async function analyticsRoutes(app: FastifyInstance) {
  app.addHook('onRequest', authenticate)

  // GET /api/analytics/overview — last 14 days summary
  app.get('/overview', async () => {
    const since = new Date(Date.now() - 14 * 24 * 3600 * 1000)

    const [posts, logs] = await Promise.all([
      prisma.post.findMany({
        where: { OR: [{ publishedAt: { gte: since } }, { createdAt: { gte: since } }] },
        select: { type: true, language: true, status: true, publishedAt: true, createdAt: true },
      }),
      prisma.publicationLog.findMany({
        where: { createdAt: { gte: since }, action: { in: ['publish', 'retry'] } },
        select: { status: true, createdAt: true, channel: { select: { name: true } } },
      }),
    ])

    // Posts published per day, last 14 days
    const perDay: { date: string; count: number }[] = []
    const perDayMap: Record<string, number> = {}
    for (let i = 13; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const key = d.toISOString().slice(0, 10)
      perDayMap[key] = 0
    }
    for (const p of posts) {
      if (!p.publishedAt) continue
      const key = p.publishedAt.toISOString().slice(0, 10)
      if (key in perDayMap) perDayMap[key]++
    }
    for (const [date, count] of Object.entries(perDayMap)) perDay.push({ date, count })

    // By type / language / status
    const byType: Record<string, number> = {}
    const byLanguage: Record<string, number> = {}
    const byStatus: Record<string, number> = {}
    for (const p of posts) {
      byType[p.type] = (byType[p.type] ?? 0) + 1
      byLanguage[p.language] = (byLanguage[p.language] ?? 0) + 1
      byStatus[p.status] = (byStatus[p.status] ?? 0) + 1
    }

    // Success rate + channel performance
    let success = 0
    let error = 0
    const channelStats: Record<string, { success: number; error: number }> = {}
    for (const l of logs) {
      const name = l.channel?.name ?? 'невідомо'
      if (!channelStats[name]) channelStats[name] = { success: 0, error: 0 }
      if (l.status === 'success') {
        success++
        channelStats[name].success++
      } else {
        error++
        channelStats[name].error++
      }
    }

    return {
      perDay,
      byType,
      byLanguage,
      byStatus,
      successRate: { success, error, total: success + error },
      channelStats,
      windowDays: 14,
    }
  })
}
