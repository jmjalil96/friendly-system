import { randomUUID } from 'node:crypto'
import type { RegisterInput } from '@friendly-system/shared'
import { prisma } from '../shared/db/prisma.js'

const ROLE_DEFINITIONS = [
  {
    name: 'OWNER',
    description: 'Organization owner',
  },
]

export async function ensureDatabaseConnection(): Promise<void> {
  await prisma.$queryRaw`SELECT 1`
}

export async function resetDb(): Promise<void> {
  // Intentionally truncate all app tables in public schema except Prisma migrations metadata.
  const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename <> '_prisma_migrations'
  `

  if (tables.length === 0) return

  const quotedTables = tables
    .map(({ tablename }) => `"${tablename.replace(/"/g, '""')}"`)
    .join(', ')

  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE ${quotedTables} RESTART IDENTITY CASCADE;`,
  )
}

export async function seedSystemRoles(): Promise<void> {
  for (const role of ROLE_DEFINITIONS) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: {},
      create: role,
    })
  }
}

export function uniqueEmail(prefix = 'user'): string {
  return `${prefix}.${randomUUID()}@example.com`
}

export function uniqueOrgName(prefix = 'Org'): string {
  return `${prefix} ${randomUUID().slice(0, 8)}`
}

export function buildRegisterInput(
  overrides: Partial<RegisterInput> = {},
): RegisterInput {
  return {
    email: uniqueEmail('register'),
    password: 'Password123!',
    firstName: 'Test',
    lastName: 'User',
    orgName: uniqueOrgName('Friendly Org'),
    ...overrides,
  }
}
