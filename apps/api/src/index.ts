import Fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import sensible from '@fastify/sensible'
import { config } from './config'
import { postsRoutes } from './routes/posts'
import { batchesRoutes } from './routes/batches'
import { channelsRoutes } from './routes/channels'
import { logsRoutes } from './routes/logs'
import { statsRoutes } from './routes/stats'
import { monitoringRoutes } from './routes/monitoring'
import { analyticsRoutes } from './routes/analytics'
import { mediaRoutes } from './routes/media'

const app = Fastify({
  logger: {
    transport:
      config.nodeEnv === 'development'
        ? { target: 'pino-pretty', options: { colorize: true } }
        : undefined,
  },
})

async function bootstrap() {
  await app.register(cors, {
    origin: config.corsOrigin,
    credentials: true,
  })

  await app.register(jwt, { secret: config.jwtSecret })
  await app.register(sensible)

  // Public auth route
  app.post('/api/auth/login', async (req, reply) => {
    const { password } = req.body as { password?: string }
    if (!password || password !== config.adminPassword) {
      return reply.status(401).send({ error: 'Invalid credentials' })
    }
    const token = app.jwt.sign({ role: 'admin' }, { expiresIn: '7d' })
    return { token }
  })

  app.get('/healthz', async () => ({ status: 'ok', ts: new Date().toISOString() }))

  await app.register(postsRoutes, { prefix: '/api/posts' })
  await app.register(batchesRoutes, { prefix: '/api/batches' })
  await app.register(channelsRoutes, { prefix: '/api/channels' })
  await app.register(logsRoutes, { prefix: '/api/logs' })
  await app.register(statsRoutes, { prefix: '/api/stats' })
  await app.register(monitoringRoutes, { prefix: '/api/monitoring' })
  await app.register(analyticsRoutes, { prefix: '/api/analytics' })
  await app.register(mediaRoutes, { prefix: '/api/media' })

  app.setErrorHandler((err, req, reply) => {
    app.log.error({ err, url: req.url }, 'Request error')
    if (err.name === 'ZodError') {
      return reply.status(400).send({ error: 'Validation error', details: err.message })
    }
    reply.status(err.statusCode ?? 500).send({ error: err.message })
  })

  await app.listen({ port: config.port, host: '0.0.0.0' })
  app.log.info(`API running on port ${config.port}`)
}

bootstrap().catch((err) => {
  console.error(err)
  process.exit(1)
})
