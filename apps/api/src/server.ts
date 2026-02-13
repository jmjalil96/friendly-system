import express from 'express'
import cookieParser from 'cookie-parser'
import pinoHttp from 'pino-http'
import { ERROR_CODES } from '@friendly-system/shared'
import { logger } from './shared/logger.js'
import { errorHandler, AppError } from './shared/middleware/error-handler.js'
import { healthRoutes } from './features/health/health.routes.js'
import { authRoutes } from './features/auth/auth.routes.js'
import { claimsRoutes } from './features/claims/claims.routes.js'
import { clientsRoutes } from './features/clients/clients.routes.js'

export function createServer() {
  const app = express()

  app.use(express.json())
  app.use(cookieParser())
  app.use(pinoHttp({ logger }))

  app.use(healthRoutes)
  app.use(authRoutes)
  app.use(claimsRoutes)
  app.use(clientsRoutes)

  app.use((_req, _res, next) => {
    next(new AppError(404, 'Not found', ERROR_CODES.NOT_FOUND))
  })

  app.use(errorHandler)

  return app
}
