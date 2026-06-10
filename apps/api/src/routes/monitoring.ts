import type { FastifyInstance } from 'fastify'
import { prisma } from '@ivengo/db'
import { TelegramClient } from '@ivengo/telegram'
import { authenticate } from '../plugins/auth'

interface CheckResult {
  name: string
  ok: boolean
  detail?: string
  latencyMs?: number
}

async function timed<T>(fn: () => Promise<T>): Promise<{ result?: T; error?: string; latencyMs: number }> {
  const start = Date.now()
  try {
    const result = await fn()
    return { result, latencyMs: Date.now() - start }
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e), latencyMs: Date.now() - start }
  }
}

export async function monitoringRoutes(app: FastifyInstance) {
  app.addHook('onRequest', authenticate)

  // GET /api/monitoring/health — connectivity checks for DB, Telegram channels, AI provider config
  app.get('/health', async () => {
    const checks: CheckResult[] = []

    // Database
    const db = await timed(() => prisma.$queryRaw`SELECT 1`)
    checks.push({ name: 'database', ok: !db.error, detail: db.error, latencyMs: db.latencyMs })

    // Telegram channels
    const channels = await prisma.telegramChannel.findMany({ where: { isActive: true } })
    if (channels.length === 0) {
      checks.push({ name: 'telegram', ok: false, detail: 'No active channels configured' })
    } else {
      for (const channel of channels) {
        const tg = await timed(() => new TelegramClient({ botToken: channel.botToken, chatId: channel.chatId }).getMe())
        checks.push({
          name: `telegram:${channel.name}`,
          ok: !tg.error,
          detail: tg.error ?? `@${tg.result?.username ?? tg.result?.first_name}`,
          latencyMs: tg.latencyMs,
        })
      }
    }

    // AI provider config
    const provider = (process.env.AI_PROVIDER ?? 'anthropic').toLowerCase()
    let aiOk = false
    let aiDetail = `provider=${provider}`
    if (provider === 'openrouter') {
      aiOk = !!process.env.OPENROUTER_API_KEY
      const keyCount = (process.env.OPENROUTER_API_KEY ?? '').split(',').filter(Boolean).length
      aiDetail += `, keys=${keyCount}, models=${(process.env.AI_MODEL ?? 'default').split(',').length}`
    } else if (provider === 'ollama') {
      aiOk = true
      aiDetail += `, baseUrl=${process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434/v1'}`
    } else {
      aiOk = !!process.env.ANTHROPIC_API_KEY
    }
    checks.push({ name: 'ai-provider', ok: aiOk, detail: aiDetail })

    const allOk = checks.every((c) => c.ok)
    return { ok: allOk, checks, ts: new Date().toISOString() }
  })

  // GET /api/monitoring/queue — current queue / backlog state
  app.get('/queue', async () => {
    const [scheduled, pendingReview, failed, processingBatches] = await Promise.all([
      prisma.post.count({ where: { status: 'scheduled' } }),
      prisma.post.count({ where: { status: 'pending_review' } }),
      prisma.post.count({ where: { status: 'failed' } }),
      prisma.contentBatch.count({ where: { status: 'processing' } }),
    ])

    const nextScheduled = await prisma.post.findFirst({
      where: { status: 'scheduled' },
      orderBy: { scheduledAt: 'asc' },
      select: { id: true, title: true, scheduledAt: true, type: true },
    })

    const overdue = await prisma.post.count({
      where: { status: 'scheduled', scheduledAt: { lt: new Date() } },
    })

    return { scheduled, pendingReview, failed, processingBatches, overdue, nextScheduled }
  })

  // GET /api/monitoring/errors — recent publication errors
  app.get('/errors', async () => {
    const errors = await prisma.publicationLog.findMany({
      where: { status: 'error' },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        post: { select: { id: true, title: true, type: true } },
        channel: { select: { name: true } },
      },
    })
    return { errors }
  })
}
