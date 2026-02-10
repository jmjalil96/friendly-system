import type { RequestHandler } from 'express'
import { ERROR_CODES } from '@friendly-system/shared'
import { AppError } from './error-handler.js'

const SCOPE_PRIORITY: Record<string, number> = { all: 0, client: 1, own: 2 }

export function requirePermission(action: string): RequestHandler {
  return (req, _res, next) => {
    const permissions = req.user!.permissions
    const scopes = permissions
      .filter((p) => p.startsWith(action + ':'))
      .map((p) => p.split(':').pop()!)
      .filter((s) => s in SCOPE_PRIORITY)

    if (scopes.length === 0) {
      throw new AppError(
        403,
        'Insufficient permissions',
        ERROR_CODES.PERMISSION_DENIED,
      )
    }

    scopes.sort((a, b) => (SCOPE_PRIORITY[a] ?? 99) - (SCOPE_PRIORITY[b] ?? 99))
    req.permissionScope = scopes[0]

    next()
  }
}
