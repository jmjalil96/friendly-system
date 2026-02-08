import type { RequestHandler } from 'express'
import type {
  RegisterInput,
  RegisterResponse,
  LoginInput,
  LoginResponse,
  MeResponse,
  VerifyEmailInput,
  ResendVerificationInput,
  ForgotPasswordInput,
  ForgotPasswordResponse,
  ResetPasswordInput,
  ChangePasswordInput,
} from '@friendly-system/shared'
import {
  register,
  login,
  logout,
  verifyEmail,
  resendVerification,
  forgotPassword,
  resetPassword,
  changePassword,
} from './auth.service.js'
import {
  SESSION_COOKIE_NAME,
  SESSION_COOKIE_OPTIONS,
} from '../../shared/middleware/session-cookie.js'

export const registerHandler: RequestHandler = async (req, res) => {
  const ctx = {
    ipAddress: req.ip ?? 'unknown',
    userAgent: req.get('user-agent') ?? 'unknown',
  }
  await register(req.body as RegisterInput, ctx)
  const response: RegisterResponse = {
    message: 'Check your inbox to verify your email',
    email: (req.body as RegisterInput).email,
  }
  res.status(201).json(response)
}

export const loginHandler: RequestHandler = async (req, res) => {
  const ctx = {
    ipAddress: req.ip ?? 'unknown',
    userAgent: req.get('user-agent') ?? 'unknown',
  }
  const { sessionToken, ...data } = await login(req.body as LoginInput, ctx)
  res.cookie(SESSION_COOKIE_NAME, sessionToken, SESSION_COOKIE_OPTIONS)
  const response: LoginResponse = data
  res.status(200).json(response)
}

export const meHandler: RequestHandler = async (req, res) => {
  const user = req.user!

  const response: MeResponse = {
    userId: user.userId,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    orgSlug: user.orgSlug,
    role: user.role,
  }

  res.status(200).json(response)
}

export const logoutHandler: RequestHandler = async (req, res) => {
  const ctx = {
    ipAddress: req.ip ?? 'unknown',
    userAgent: req.get('user-agent') ?? 'unknown',
  }

  await logout(
    req.user!.userId,
    req.user!.orgId,
    req.sessionInfo!.sessionId,
    ctx,
  )

  res.clearCookie(SESSION_COOKIE_NAME, SESSION_COOKIE_OPTIONS)
  res.status(200).json({ message: 'Logged out' })
}

export const verifyEmailHandler: RequestHandler = async (req, res) => {
  const ctx = {
    ipAddress: req.ip ?? 'unknown',
    userAgent: req.get('user-agent') ?? 'unknown',
  }
  await verifyEmail((req.body as VerifyEmailInput).token, ctx)
  res.status(200).json({ message: 'Email verified' })
}

export const resendVerificationHandler: RequestHandler = async (req, res) => {
  const ctx = {
    ipAddress: req.ip ?? 'unknown',
    userAgent: req.get('user-agent') ?? 'unknown',
  }
  await resendVerification((req.body as ResendVerificationInput).email, ctx)
  res.status(200).json({
    message: 'If that email is registered, a verification link has been sent',
  })
}

export const forgotPasswordHandler: RequestHandler = async (req, res) => {
  const ctx = {
    ipAddress: req.ip ?? 'unknown',
    userAgent: req.get('user-agent') ?? 'unknown',
  }
  await forgotPassword((req.body as ForgotPasswordInput).email, ctx)
  const response: ForgotPasswordResponse = {
    message: 'If that email is registered, a password reset link has been sent',
    email: (req.body as ForgotPasswordInput).email,
  }
  res.status(200).json(response)
}

export const resetPasswordHandler: RequestHandler = async (req, res) => {
  const ctx = {
    ipAddress: req.ip ?? 'unknown',
    userAgent: req.get('user-agent') ?? 'unknown',
  }
  const { token, newPassword } = req.body as ResetPasswordInput
  await resetPassword(token, newPassword, ctx)
  res.status(200).json({ message: 'Password reset' })
}

export const changePasswordHandler: RequestHandler = async (req, res) => {
  const ctx = {
    ipAddress: req.ip ?? 'unknown',
    userAgent: req.get('user-agent') ?? 'unknown',
  }
  await changePassword(
    req.user!.userId,
    req.user!.orgId,
    req.sessionInfo!.sessionId,
    req.body as ChangePasswordInput,
    ctx,
  )
  res.status(200).json({ message: 'Password changed' })
}
