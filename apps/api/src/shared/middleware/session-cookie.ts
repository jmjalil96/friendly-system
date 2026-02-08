import type { CookieOptions } from 'express'
import { env } from '../../config/env.js'
import {
  SESSION_COOKIE_NAME,
  SESSION_EXPIRY_DAYS,
} from '../../features/auth/auth.constants.js'

export { SESSION_COOKIE_NAME }

export const SESSION_COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
  maxAge: SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
}
