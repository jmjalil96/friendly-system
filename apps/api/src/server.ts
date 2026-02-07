import express from 'express'
import pinoHttp from 'pino-http'
import { logger } from './shared/logger.js'
import { errorHandler, AppError } from './shared/error-handler.js'
import { healthRoutes } from './features/health/health.routes.js'

export function createServer() {
  const app = express()

  app.use(express.json())
  app.use(pinoHttp({ logger }))

  app.use(healthRoutes)

  app.use((_req, _res, next) => {
    next(new AppError(404, 'Not found'))
  })

  app.use(errorHandler)

  return app
}
