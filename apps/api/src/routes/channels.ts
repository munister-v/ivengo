import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '@ivengo/db'
import { TelegramClient, normalizeChatId, isInviteLink } from '@ivengo/telegram'
import { authenticate } from '../plugins/auth'

const channelSchema = z.object({
  name: z.string().min(1),
  chatId: z.string().min(1),
  botToken: z.string().min(10),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
  premiumEmoji: z.boolean().default(false),
})

const validateSchema = z.object({
  botToken: z.string().min(10),
  chatId: z.string().min(1),
})

export async function channelsRoutes(app: FastifyInstance) {
  app.addHook('onRequest', authenticate)

  app.get('/', async () => {
    return prisma.telegramChannel.findMany({ orderBy: { createdAt: 'desc' } })
  })

  // Validate a bot token + chat ID before saving — checks the token is valid,
  // the bot can see the chat, and the bot has permission to post there.
  app.post('/validate', async (req, reply) => {
    const { botToken, chatId } = validateSchema.parse(req.body)

    // Private invite links (t.me/+hash, joinchat) cannot serve as a chat_id.
    if (isInviteLink(chatId)) {
      return reply.status(400).send({
        error:
          'Це приватне посилання-запрошення — його не можна використати як Chat ID. Додайте бота адміністратором у канал і вкажіть @username (публічні) або числовий ID -100… (приватні).',
      })
    }

    // Accept @nick, t.me/nick, https://t.me/nick, bare nick or numeric id.
    const normalizedChatId = normalizeChatId(chatId)
    const client = new TelegramClient({ botToken, chatId: normalizedChatId })

    let me: { id: number; username?: string; first_name: string }
    try {
      me = await client.getMe()
    } catch (err: unknown) {
      const error = err instanceof Error ? err.message : String(err)
      return reply.status(400).send({ error: `Невірний токен бота: ${error}` })
    }

    let chat: { title?: string; username?: string; type: string }
    try {
      chat = await client.getChat()
    } catch (err: unknown) {
      const error = err instanceof Error ? err.message : String(err)
      return reply.status(400).send({
        error: `Бот не бачить цей чат/канал: ${error}. Перевірте Chat ID та переконайтесь, що бот доданий до каналу.`,
        bot: { username: me.username, name: me.first_name },
      })
    }

    let canPost: boolean | null = null
    let memberStatus: string | null = null
    try {
      const member = await client.getChatMember(me.id)
      memberStatus = member.status
      canPost = member.status === 'creator'
        || member.status === 'administrator'
        || member.status === 'member'
      if (member.status === 'administrator' && member.can_post_messages === false) {
        canPost = false
      }
    } catch {
      // getChatMember may fail for some chat types — not fatal, the test message will tell the truth
    }

    return {
      normalizedChatId,
      bot: { username: me.username, name: me.first_name },
      chat: { title: chat.title, username: chat.username, type: chat.type },
      memberStatus,
      canPost,
      warning: canPost === false
        ? 'Бот доданий до каналу, але не має прав публікувати повідомлення. Зробіть його адміністратором з правом "Публікація повідомлень".'
        : undefined,
    }
  })

  app.post('/', async (req, reply) => {
    const body = channelSchema.parse(req.body)
    const channel = await prisma.telegramChannel.create({
      data: { ...body, chatId: normalizeChatId(body.chatId) },
    })
    return reply.status(201).send(channel)
  })

  app.patch('/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    const body = channelSchema.partial().parse(req.body)
    const channel = await prisma.telegramChannel.update({
      where: { id },
      data: { ...body, ...(body.chatId ? { chatId: normalizeChatId(body.chatId) } : {}) },
    })
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
      const raw = err instanceof Error ? err.message : String(err)
      return reply.status(500).send({ error: explainTelegramError(raw) })
    }
  })
}

/**
 * Turns a raw Telegram Bot API error into an actionable Ukrainian hint. The bare
 * "Bad Request" Telegram returns is useless to the user, so we map the common
 * causes (bot not in channel, not an admin, wrong chat id) to concrete fixes.
 */
function explainTelegramError(raw: string): string {
  const lower = raw.toLowerCase()
  if (lower.includes('chat not found')) {
    return 'Канал не знайдено. Перевірте Chat ID (@username або числовий -100…) і переконайтесь, що бот доданий до каналу.'
  }
  if (lower.includes('bot is not a member') || lower.includes('bot was kicked') || lower.includes('not enough rights') || lower.includes('need administrator') || lower.includes("can't post") || lower.includes('chat_admin_required')) {
    return 'Бот не має прав публікувати у цьому каналі. Додайте бота адміністратором каналу з правом «Публікація повідомлень».'
  }
  if (lower.includes('unauthorized') || lower.includes('401')) {
    return 'Невірний токен бота. Скопіюйте токен заново з @BotFather.'
  }
  if (lower.includes('bad request')) {
    return `${raw} — найчастіша причина: бот ще не доданий адміністратором каналу. Додайте його в адміни і повторіть.`
  }
  return raw
}
