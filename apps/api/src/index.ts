import { env } from './config/env.js'
import { logger } from './shared/logger.js'
import { prisma } from './shared/db/prisma.js'
import { createServer } from './server.js'

const app = createServer()

const server = app.listen(env.PORT, () => {
  logger.info({ port: env.PORT, env: env.NODE_ENV }, 'Server started')
})

function shutdown() {
  logger.info('Shutting down...')
  server.close(async () => {
    await prisma.$disconnect()
    logger.info('Shutdown complete')
    process.exit(0)
  })
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
