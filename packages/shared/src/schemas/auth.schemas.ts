import { z } from 'zod'

const noNullBytes = (s: string) => !s.includes('\0')
const NULL_BYTE_MSG = 'Invalid characters'

export const registerSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email()
    .max(255)
    .refine(noNullBytes, NULL_BYTE_MSG),
  password: z
    .string()
    .min(8)
    .max(128)
    .regex(/\S/, 'Password cannot be blank')
    .refine(noNullBytes, NULL_BYTE_MSG),
  firstName: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .refine(noNullBytes, NULL_BYTE_MSG),
  lastName: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .refine(noNullBytes, NULL_BYTE_MSG),
  orgName: z.string().trim().min(1).max(255).refine(noNullBytes, NULL_BYTE_MSG),
})

export type RegisterInput = z.infer<typeof registerSchema>

export const registerResponseSchema = z.object({
  message: z.string(),
  email: z.string(),
})

export type RegisterResponse = z.infer<typeof registerResponseSchema>

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email()
    .max(255)
    .refine(noNullBytes, NULL_BYTE_MSG),
  password: z.string().min(1).max(128).refine(noNullBytes, NULL_BYTE_MSG),
})

export type LoginInput = z.infer<typeof loginSchema>

export const loginResponseSchema = z.object({
  userId: z.string().uuid(),
  email: z.string(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  orgSlug: z.string(),
  role: z.string(),
})

export type LoginResponse = z.infer<typeof loginResponseSchema>

export const meResponseSchema = z.object({
  userId: z.string().uuid(),
  email: z.string(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  orgSlug: z.string(),
  role: z.string(),
})

export type MeResponse = z.infer<typeof meResponseSchema>

export const verifyEmailSchema = z.object({
  token: z.string().min(1).max(255).refine(noNullBytes, NULL_BYTE_MSG),
})

export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>

export const resendVerificationSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email()
    .max(255)
    .refine(noNullBytes, NULL_BYTE_MSG),
})

export type ResendVerificationInput = z.infer<typeof resendVerificationSchema>

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email()
    .max(255)
    .refine(noNullBytes, NULL_BYTE_MSG),
})

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>

export const forgotPasswordResponseSchema = z.object({
  message: z.string(),
  email: z.string(),
})

export type ForgotPasswordResponse = z.infer<
  typeof forgotPasswordResponseSchema
>

export const resetPasswordSchema = z.object({
  token: z.string().min(1).max(255).refine(noNullBytes, NULL_BYTE_MSG),
  newPassword: z
    .string()
    .min(8)
    .max(128)
    .regex(/\S/, 'Password cannot be blank')
    .refine(noNullBytes, NULL_BYTE_MSG),
})

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>

export const changePasswordSchema = z.object({
  currentPassword: z
    .string()
    .min(1)
    .max(128)
    .refine(noNullBytes, NULL_BYTE_MSG),
  newPassword: z
    .string()
    .min(8)
    .max(128)
    .regex(/\S/, 'Password cannot be blank')
    .refine(noNullBytes, NULL_BYTE_MSG),
})

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>
