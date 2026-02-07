import type { ErrorRequestHandler } from 'express'
import { logger } from './logger.js'

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
    res.status(err.statusCode).json({
      error: { message: err.message, statusCode: err.statusCode },
    })
    return
  }

  logger.error(err, 'Unhandled error')
  res.status(500).json({
    error: { message: 'Internal server error', statusCode: 500 },
  })
}
