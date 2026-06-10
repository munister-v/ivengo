import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '@ivengo/db'
import { authenticate } from '../plugins/auth'

const mediaSchema = z.object({
  url: z.string().url(),
  name: z.string().optional(),
  tags: z.string().optional(),
})

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
}
