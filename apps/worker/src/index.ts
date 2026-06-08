import cron from 'node-cron'
import pino from 'pino'
import { prisma } from '@ivengo/db'
import { runSchedulerTick } from './scheduler'

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport:
    process.env.NODE_ENV === 'development'
      ? { target: 'pino-pretty', options: { colorize: true } }
      : undefined,
})

const INTERVAL = process.env.WORKER_CRON || '* * * * *' // every minute

logger.info({ cron: INTERVAL }, 'Ivengo Worker starting')

let isRunning = false

cron.schedule(INTERVAL, async () => {
  if (isRunning) {
    logger.warn('Scheduler tick skipped — previous tick still running')
    return
  }
  isRunning = true
  try {
    await runSchedulerTick(logger)
  } catch (err) {
    logger.error(err, 'Unexpected error in scheduler tick')
  } finally {
    isRunning = false
  }
})

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully')
  await prisma.$disconnect()
  process.exit(0)
})

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully')
  await prisma.$disconnect()
  process.exit(0)
})

logger.info('Worker is running. Waiting for scheduled posts...')
