import { afterAll, beforeAll, beforeEach } from 'vitest'
import { env } from '../config/env.js'
import { prisma } from '../shared/db/prisma.js'
import { ensureDatabaseConnection, resetDb, seedSystemRoles } from './db.js'

beforeAll(async () => {
  if (env.NODE_ENV !== 'test') {
    throw new Error('Test setup requires NODE_ENV=test')
  }
  if (!env.DATABASE_URL.includes('_test')) {
    throw new Error(
      `Refusing to run tests against non-test database URL: ${env.DATABASE_URL}`,
    )
  }
  await ensureDatabaseConnection()
}, 30_000)

beforeEach(async () => {
  await resetDb()
  await seedSystemRoles()
})

afterAll(async () => {
  await resetDb()
  await prisma.$disconnect()
})
