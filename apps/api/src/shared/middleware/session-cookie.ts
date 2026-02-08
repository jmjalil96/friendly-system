import type { CookieOptions } from 'express'
import { env } from '../../config/env.js'

export const SESSION_COOKIE_NAME = 'session'

export const SESSION_COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
  maxAge: 30 * 24 * 60 * 60 * 1000,
}
