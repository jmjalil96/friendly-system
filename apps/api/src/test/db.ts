import { randomUUID } from 'node:crypto'
import type { RegisterInput } from '@friendly-system/shared'
import { ROLES, PERMISSIONS } from '@friendly-system/shared'
import { prisma } from '../shared/db/prisma.js'

const ROLE_DEFINITIONS = [
  { name: ROLES.OWNER, description: 'Organization owner' },
  { name: ROLES.ADMIN, description: 'Organization admin' },
  { name: ROLES.MEMBER, description: 'Organization member' },
]

const PERMISSION_DEFINITIONS = [
  {
    action: PERMISSIONS.CLAIMS_CREATE_ALL,
    description: 'Create claims for any client',
  },
  {
    action: PERMISSIONS.CLAIMS_CREATE_CLIENT,
    description: 'Create claims for assigned clients',
  },
  {
    action: PERMISSIONS.CLAIMS_CREATE_OWN,
    description: 'Create claims for own affiliate',
  },
  {
    action: PERMISSIONS.CLAIMS_READ_ALL,
    description: 'Read any claim',
  },
  {
    action: PERMISSIONS.CLAIMS_READ_CLIENT,
    description: 'Read claims for assigned clients',
  },
  {
    action: PERMISSIONS.CLAIMS_READ_OWN,
    description: 'Read own claims',
  },
  {
    action: PERMISSIONS.CLAIMS_UPDATE_ALL,
    description: 'Update any claim',
  },
  {
    action: PERMISSIONS.CLAIMS_UPDATE_CLIENT,
    description: 'Update claims for assigned clients',
  },
  {
    action: PERMISSIONS.CLAIMS_UPDATE_OWN,
    description: 'Update own claims',
  },
  {
    action: PERMISSIONS.CLAIMS_TRANSITION_ALL,
    description: 'Transition any claim',
  },
  {
    action: PERMISSIONS.CLAIMS_TRANSITION_CLIENT,
    description: 'Transition claims for assigned clients',
  },
  {
    action: PERMISSIONS.CLAIMS_TRANSITION_OWN,
    description: 'Transition own claims',
  },
  {
    action: PERMISSIONS.CLIENTS_CREATE_ALL,
    description: 'Create clients in organization',
  },
  {
    action: PERMISSIONS.CLIENTS_CREATE_CLIENT,
    description: 'Create clients in assigned scope',
  },
  {
    action: PERMISSIONS.CLIENTS_READ_ALL,
    description: 'Read any client',
  },
  {
    action: PERMISSIONS.CLIENTS_READ_CLIENT,
    description: 'Read assigned clients',
  },
  {
    action: PERMISSIONS.CLIENTS_READ_OWN,
    description: 'Read own linked clients',
  },
  {
    action: PERMISSIONS.CLIENTS_UPDATE_ALL,
    description: 'Update any client',
  },
  {
    action: PERMISSIONS.CLIENTS_UPDATE_CLIENT,
    description: 'Update assigned clients',
  },
]

const ROLE_PERMISSION_MAP: Record<string, string[]> = {
  [ROLES.OWNER]: [
    PERMISSIONS.CLAIMS_CREATE_ALL,
    PERMISSIONS.CLAIMS_READ_ALL,
    PERMISSIONS.CLAIMS_UPDATE_ALL,
    PERMISSIONS.CLAIMS_TRANSITION_ALL,
    PERMISSIONS.CLIENTS_CREATE_ALL,
    PERMISSIONS.CLIENTS_READ_ALL,
    PERMISSIONS.CLIENTS_UPDATE_ALL,
  ],
  [ROLES.ADMIN]: [
    PERMISSIONS.CLAIMS_CREATE_CLIENT,
    PERMISSIONS.CLAIMS_READ_CLIENT,
    PERMISSIONS.CLAIMS_UPDATE_CLIENT,
    PERMISSIONS.CLAIMS_TRANSITION_CLIENT,
    PERMISSIONS.CLIENTS_CREATE_CLIENT,
    PERMISSIONS.CLIENTS_READ_CLIENT,
    PERMISSIONS.CLIENTS_UPDATE_CLIENT,
  ],
  [ROLES.MEMBER]: [
    PERMISSIONS.CLAIMS_CREATE_OWN,
    PERMISSIONS.CLAIMS_READ_OWN,
    PERMISSIONS.CLAIMS_UPDATE_OWN,
    PERMISSIONS.CLAIMS_TRANSITION_OWN,
    PERMISSIONS.CLIENTS_READ_OWN,
  ],
}

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

  for (const perm of PERMISSION_DEFINITIONS) {
    await prisma.permission.upsert({
      where: { action: perm.action },
      update: {},
      create: perm,
    })
  }

  for (const [roleName, actions] of Object.entries(ROLE_PERMISSION_MAP)) {
    const role = await prisma.role.findUniqueOrThrow({
      where: { name: roleName },
    })
    for (const action of actions) {
      const permission = await prisma.permission.findUniqueOrThrow({
        where: { action },
      })
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: role.id,
            permissionId: permission.id,
          },
        },
        update: {},
        create: { roleId: role.id, permissionId: permission.id },
      })
    }
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
