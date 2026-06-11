import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '@ivengo/db'
import { TelegramClient } from '@ivengo/telegram'
import { authenticate } from '../plugins/auth'

const emojiSchema = z.object({
  label: z.string().min(1),
  customEmojiId: z.string().regex(/^\d+$/, 'custom_emoji_id має бути числом'),
  fallback: z.string().min(1).max(16),
  category: z.string().min(1).default('general'),
  setName: z.string().optional(),
  isAnimated: z.boolean().default(false),
})

export async function customEmojiRoutes(app: FastifyInstance) {
  app.addHook('onRequest', authenticate)

  // GET /api/custom-emoji — full library, grouped client-side by category
  app.get('/', async () => {
    return prisma.customEmoji.findMany({ orderBy: [{ category: 'asc' }, { createdAt: 'desc' }] })
  })

  // POST /api/custom-emoji
  app.post('/', async (req, reply) => {
    const body = emojiSchema.parse(req.body)
    try {
      const emoji = await prisma.customEmoji.create({ data: body })
      return reply.status(201).send(emoji)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes('Unique constraint')) {
        return reply.status(409).send({ error: 'Цей custom_emoji_id вже додано' })
      }
      throw err
    }
  })

  // PATCH /api/custom-emoji/:id
  app.patch('/:id', async (req) => {
    const { id } = req.params as { id: string }
    const body = emojiSchema.partial().parse(req.body)
    return prisma.customEmoji.update({ where: { id }, data: body })
  })

  // DELETE /api/custom-emoji/:id
  app.delete('/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    await prisma.customEmoji.delete({ where: { id } })
    return reply.status(204).send()
  })

  // POST /api/custom-emoji/verify — validate ids against Telegram via a premium-enabled
  // channel's bot, returning the resolved base emoji + sticker-set name for each.
  app.post('/verify', async (req, reply) => {
    const { ids, channelId } = z
      .object({ ids: z.array(z.string().regex(/^\d+$/)).min(1).max(200), channelId: z.string().optional() })
      .parse(req.body)

    const channel = channelId
      ? await prisma.telegramChannel.findUnique({ where: { id: channelId } })
      : await prisma.telegramChannel.findFirst({ where: { isActive: true } })
    if (!channel) return reply.status(503).send({ error: 'Немає активного каналу для перевірки' })

    try {
      const client = new TelegramClient({ botToken: channel.botToken, chatId: channel.chatId })
      const stickers = await client.getCustomEmojiStickers(ids)
      const found = new Map(stickers.map((s) => [s.custom_emoji_id, s]))
      return {
        results: ids.map((id) => {
          const s = found.get(id)
          return {
            customEmojiId: id,
            valid: !!s,
            emoji: s?.emoji ?? null,
            setName: s?.set_name ?? null,
            isAnimated: s?.is_animated ?? false,
          }
        }),
      }
    } catch (err: unknown) {
      const error = err instanceof Error ? err.message : String(err)
      return reply.status(502).send({ error })
    }
  })
}
