import type { ErrorRequestHandler } from 'express'
import {
  ERROR_CODES,
  type ErrorCode,
  type ErrorResponse,
} from '@friendly-system/shared'
import { logger } from '../logger.js'

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code: ErrorCode,
  ) {
    super(message)
  }
}

function codeForStatus(status: number): ErrorCode {
  switch (status) {
    case 400:
      return ERROR_CODES.BAD_REQUEST
    case 401:
      return ERROR_CODES.UNAUTHORIZED
    case 403:
      return ERROR_CODES.FORBIDDEN
    case 404:
      return ERROR_CODES.NOT_FOUND
    case 405:
      return ERROR_CODES.METHOD_NOT_ALLOWED
    case 409:
      return ERROR_CODES.CONFLICT
    case 413:
      return ERROR_CODES.PAYLOAD_TOO_LARGE
    case 415:
      return ERROR_CODES.UNSUPPORTED_MEDIA_TYPE
    case 422:
      return ERROR_CODES.UNPROCESSABLE_ENTITY
    case 429:
      return ERROR_CODES.TOO_MANY_REQUESTS
    default:
      return status >= 400 && status < 500
        ? ERROR_CODES.CLIENT_ERROR
        : ERROR_CODES.INTERNAL_ERROR
  }
}

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof AppError) {
    const response: ErrorResponse = {
      error: { message: err.message, statusCode: err.statusCode, code: err.code },
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
        code: codeForStatus(status),
      },
    }
    res.status(status).json(response)
    return
  }

  logger.error(err, 'Unhandled error')
  const response: ErrorResponse = {
    error: {
      message: 'Internal server error',
      statusCode: 500,
      code: ERROR_CODES.INTERNAL_ERROR,
    },
  }
  res.status(500).json(response)
}
