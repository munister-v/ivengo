import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { randomUUID } from 'node:crypto'
import path from 'node:path'
import fs from 'node:fs/promises'
import { prisma } from '@ivengo/db'
import { generateImage } from '@ivengo/generator'
import { authenticate } from '../plugins/auth'

const mediaSchema = z.object({
  url: z.string().url(),
  name: z.string().optional(),
  tags: z.string().optional(),
})

const generateImageSchema = z.object({
  prompt: z.string().min(2, 'Опишіть, що згенерувати'),
  width: z.number().int().min(192).max(1024).optional(),
  height: z.number().int().min(192).max(1024).optional(),
  negativePrompt: z.string().max(500).optional(),
  model: z.string().max(100).optional(),
})

const UPLOAD_DIR = process.env.UPLOAD_DIR ?? '/app/uploads'

export async function mediaRoutes(app: FastifyInstance) {
  app.addHook('onRequest', authenticate)

  // GET /api/media
  app.get('/', async () => {
    return prisma.mediaAsset.findMany({ orderBy: { createdAt: 'desc' } })
  })

  // POST /api/media — register an image/video URL in the library
  app.post('/', async (req, reply) => {
    const body = mediaSchema.parse(req.body)
    const asset = await prisma.mediaAsset.create({ data: body })
    return reply.status(201).send(asset)
  })

  // DELETE /api/media/:id
  app.delete('/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    await prisma.mediaAsset.delete({ where: { id } })
    return reply.status(204).send()
  })

  // POST /api/media/generate-image — free AI image generation (AI Horde, no API key)
  // Generates the image, downloads it, and stores it locally so the URL stays
  // valid indefinitely (the AI Horde's own link expires after ~30 minutes).
  app.post('/generate-image', async (req, reply) => {
    const body = generateImageSchema.parse(req.body)

    let tempUrl: string
    try {
      tempUrl = await generateImage(body.prompt, body)
    } catch (e) {
      app.log.error({ err: e }, 'Image generation failed')
      return reply.status(502).send({ error: e instanceof Error ? e.message : 'Image generation failed' })
    }

    const imgRes = await fetch(tempUrl)
    if (!imgRes.ok) {
      return reply.status(502).send({ error: 'Failed to download generated image' })
    }
    const buf = Buffer.from(await imgRes.arrayBuffer())
    const ext = tempUrl.split('?')[0].split('.').pop() === 'png' ? 'png' : 'webp'
    const filename = `${randomUUID()}.${ext}`

    await fs.mkdir(UPLOAD_DIR, { recursive: true })
    await fs.writeFile(path.join(UPLOAD_DIR, filename), buf)

    const publicBase = (process.env.PUBLIC_API_URL ?? 'http://localhost:3001').replace(/\/$/, '')
    return { url: `${publicBase}/uploads/${filename}`, prompt: body.prompt }
  })
}
