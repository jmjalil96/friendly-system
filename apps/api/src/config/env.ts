import { config as loadEnv } from 'dotenv'
import { z } from 'zod'

const runtimeNodeEnv = process.env.NODE_ENV ?? 'development'
loadEnv({ path: runtimeNodeEnv === 'test' ? '.env.test' : '.env' })

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().min(1),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  console.error('Invalid environment variables:')
  console.error(parsed.error.flatten().fieldErrors)
  process.exit(1)
}

export const env = parsed.data
