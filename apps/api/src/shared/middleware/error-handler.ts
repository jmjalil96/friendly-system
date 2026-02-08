import type { ErrorRequestHandler } from 'express'
import type { ErrorResponse } from '@friendly-system/shared'
import { logger } from '../logger.js'

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message)
  }
}

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof AppError) {
    const response: ErrorResponse = {
      error: { message: err.message, statusCode: err.statusCode },
    }
    res.status(err.statusCode).json(response)
    return
  }

  // Handle errors from Express middleware (body-parser, etc.)
  // These set statusCode/status and expose=true for client-safe messages
  const status = err.statusCode ?? err.status
  if (status && status >= 400 && status < 500) {
    const response: ErrorResponse = {
      error: {
        message: err.expose ? err.message : 'Bad request',
        statusCode: status,
      },
    }
    res.status(status).json(response)
    return
  }

  logger.error(err, 'Unhandled error')
  const response: ErrorResponse = {
    error: { message: 'Internal server error', statusCode: 500 },
  }
  res.status(500).json(response)
}
