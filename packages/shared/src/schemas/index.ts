import { z } from 'zod'

export const appConfigSchema = z.object({
  name: z.string(),
})

export type AppConfig = z.infer<typeof appConfigSchema>
