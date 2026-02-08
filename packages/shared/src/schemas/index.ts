import { z } from 'zod'

export const appConfigSchema = z.object({
  name: z.string(),
})

export type AppConfig = z.infer<typeof appConfigSchema>

export const errorResponseSchema = z.object({
  error: z.object({
    message: z.string(),
    statusCode: z.number(),
  }),
})

export type ErrorResponse = z.infer<typeof errorResponseSchema>

export * from './auth.schemas.js'
