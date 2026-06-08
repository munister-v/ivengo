import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '@ivengo/db'
import { TelegramClient } from '@ivengo/telegram'
import { authenticate } from '../plugins/auth'

const channelSchema = z.object({
  name: z.string().min(1),
  chatId: z.string().min(1),
  botToken: z.string().min(10),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
})

export async function channelsRoutes(app: FastifyInstance) {
  app.addHook('onRequest', authenticate)

  app.get('/', async () => {
    return prisma.telegramChannel.findMany({ orderBy: { createdAt: 'desc' } })
  })

  app.post('/', async (req, reply) => {
    const body = channelSchema.parse(req.body)
    const channel = await prisma.telegramChannel.create({ data: body })
    return reply.status(201).send(channel)
  })

  app.patch('/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    const body = channelSchema.partial().parse(req.body)
    const channel = await prisma.telegramChannel.update({ where: { id }, data: body })
    return channel
  })

  app.delete('/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    await prisma.telegramChannel.update({ where: { id }, data: { isActive: false } })
    return reply.status(204).send()
  })

  // Test bot connection
  app.post('/:id/test', async (req, reply) => {
    const { id } = req.params as { id: string }
    const channel = await prisma.telegramChannel.findUnique({ where: { id } })
    if (!channel) return reply.status(404).send({ error: 'Not found' })

    try {
      const client = new TelegramClient({ botToken: channel.botToken, chatId: channel.chatId })
      await client.sendMessage('✅ Тест підключення Ivengo Bot пройшов успішно!')
      return { success: true }
    } catch (err: unknown) {
      const error = err instanceof Error ? err.message : String(err)
      return reply.status(500).send({ error })
    }
  })
}
