import { Router } from 'express'
import {
  API_ROUTES,
  registerSchema,
  loginSchema,
  verifyEmailSchema,
  resendVerificationSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
} from '@friendly-system/shared'
import { validate } from '../../shared/middleware/validate.js'
import { requireAuth } from '../../shared/middleware/require-auth.js'
import {
  registerHandler,
  loginHandler,
  meHandler,
  logoutHandler,
  verifyEmailHandler,
  resendVerificationHandler,
  forgotPasswordHandler,
  resetPasswordHandler,
  changePasswordHandler,
} from './auth.handler.js'

export const authRoutes = Router()

authRoutes.post(
  API_ROUTES.auth.register,
  validate({ body: registerSchema }),
  registerHandler,
)

authRoutes.post(
  API_ROUTES.auth.login,
  validate({ body: loginSchema }),
  loginHandler,
)

authRoutes.get(API_ROUTES.auth.me, requireAuth, meHandler)

authRoutes.post(API_ROUTES.auth.logout, requireAuth, logoutHandler)

authRoutes.post(
  API_ROUTES.auth.verifyEmail,
  validate({ body: verifyEmailSchema }),
  verifyEmailHandler,
)

authRoutes.post(
  API_ROUTES.auth.resendVerification,
  validate({ body: resendVerificationSchema }),
  resendVerificationHandler,
)

authRoutes.post(
  API_ROUTES.auth.forgotPassword,
  validate({ body: forgotPasswordSchema }),
  forgotPasswordHandler,
)

authRoutes.post(
  API_ROUTES.auth.resetPassword,
  validate({ body: resetPasswordSchema }),
  resetPasswordHandler,
)

authRoutes.post(
  API_ROUTES.auth.changePassword,
  requireAuth,
  validate({ body: changePasswordSchema }),
  changePasswordHandler,
)
