import { config as loadEnv } from 'dotenv'
loadEnv()

import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'
import { hashPassword } from '../src/shared/crypto/password.js'
import { slugify } from '../src/shared/slug.js'
import { ROLES, PERMISSIONS } from '@friendly-system/shared'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

// ── Constants ────────────────────────────────────────────────────────

const PASSWORD = 'Password123!'
const SEED_IP = '127.0.0.1'
const SEED_UA = 'seed-script/1.0'

// ── Helpers ──────────────────────────────────────────────────────────

async function truncateAll() {
  const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename <> '_prisma_migrations'
  `
  if (tables.length === 0) return

  const quoted = tables
    .map(({ tablename }) => `"${tablename.replace(/"/g, '""')}"`)
    .join(', ')

  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE ${quoted} RESTART IDENTITY CASCADE;`,
  )
}

// ── Roles & Permissions ──────────────────────────────────────────────

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
  { action: PERMISSIONS.CLAIMS_READ_ALL, description: 'Read any claim' },
  {
    action: PERMISSIONS.CLAIMS_READ_CLIENT,
    description: 'Read claims for assigned clients',
  },
  { action: PERMISSIONS.CLAIMS_READ_OWN, description: 'Read own claims' },
  { action: PERMISSIONS.CLAIMS_UPDATE_ALL, description: 'Update any claim' },
  {
    action: PERMISSIONS.CLAIMS_UPDATE_CLIENT,
    description: 'Update claims for assigned clients',
  },
  { action: PERMISSIONS.CLAIMS_UPDATE_OWN, description: 'Update own claims' },
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

async function seedRolesAndPerms() {
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
          roleId_permissionId: { roleId: role.id, permissionId: permission.id },
        },
        update: {},
        create: { roleId: role.id, permissionId: permission.id },
      })
    }
  }

  // Create VIEWER role with zero permissions
  await prisma.role.upsert({
    where: { name: 'VIEWER' },
    update: {},
    create: {
      name: 'VIEWER',
      description: 'Viewer role with no claims permissions',
    },
  })
}

// ── User Helper ──────────────────────────────────────────────────────

async function createUser(
  email: string,
  roleName: string,
  orgId: string,
  firstName: string,
  lastName: string,
): Promise<string> {
  const role = await prisma.role.findUniqueOrThrow({
    where: { name: roleName },
  })
  const hash = await hashPassword(PASSWORD)

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash: hash,
      emailVerified: true,
      isActive: true,
      orgId,
      roleId: role.id,
    },
  })

  await prisma.userProfile.create({
    data: { userId: user.id, firstName, lastName },
  })

  return user.id
}

// ── Insurers ─────────────────────────────────────────────────────────

async function seedInsurers() {
  const sura = await prisma.insurer.upsert({
    where: { name: 'Sura Medicina Prepagada' },
    update: {},
    create: { name: 'Sura Medicina Prepagada', type: 'MEDICINA_PREPAGADA' },
  })

  const bolivar = await prisma.insurer.upsert({
    where: { name: 'Seguros Bolivar' },
    update: {},
    create: { name: 'Seguros Bolivar', type: 'COMPANIA_DE_SEGUROS' },
  })

  return { sura, bolivar }
}

// ── Claim + History + Audit Helpers ──────────────────────────────────

interface ClaimSeedInput {
  orgId: string
  clientId: string
  affiliateId: string
  patientId: string
  description: string
  createdById: string
  policyId?: string
  careType?: 'AMBULATORY' | 'HOSPITALARY' | 'OTHER'
  diagnosis?: string
  incidentDate?: Date
  amountSubmitted?: string
  submittedDate?: Date
  amountApproved?: string
  amountDenied?: string
  amountUnprocessed?: string
  deductibleApplied?: string
  copayApplied?: string
  settlementDate?: Date
  settlementNumber?: string
  settlementNotes?: string
  businessDays?: number
  transitions?: Array<{
    toStatus:
      | 'DRAFT'
      | 'IN_REVIEW'
      | 'SUBMITTED'
      | 'PENDING_INFO'
      | 'RETURNED'
      | 'CANCELLED'
      | 'SETTLED'
    reason?: string
    notes?: string
  }>
  invoices?: Array<{
    invoiceNumber: string
    providerName: string
    amountSubmitted: string
  }>
}

async function seedClaim(input: ClaimSeedInput): Promise<string> {
  return prisma.$transaction(async (tx) => {
    // 1. Create claim in DRAFT
    const claim = await tx.claim.create({
      data: {
        orgId: input.orgId,
        clientId: input.clientId,
        affiliateId: input.affiliateId,
        patientId: input.patientId,
        description: input.description,
        status: 'DRAFT',
        createdById: input.createdById,
        policyId: input.policyId ?? null,
        careType: input.careType ?? null,
        diagnosis: input.diagnosis ?? null,
        incidentDate: input.incidentDate ?? null,
        amountSubmitted: input.amountSubmitted ?? null,
        submittedDate: input.submittedDate ?? null,
        amountApproved: input.amountApproved ?? null,
        amountDenied: input.amountDenied ?? null,
        amountUnprocessed: input.amountUnprocessed ?? null,
        deductibleApplied: input.deductibleApplied ?? null,
        copayApplied: input.copayApplied ?? null,
        settlementDate: input.settlementDate ?? null,
        settlementNumber: input.settlementNumber ?? null,
        settlementNotes: input.settlementNotes ?? null,
        businessDays: input.businessDays ?? null,
      },
    })

    // 2. Initial history entry (→DRAFT)
    await tx.claimHistory.create({
      data: {
        claimId: claim.id,
        toStatus: 'DRAFT',
        createdById: input.createdById,
      },
    })

    // 3. Audit log for creation
    await tx.auditLog.create({
      data: {
        userId: input.createdById,
        orgId: input.orgId,
        action: 'claim.created',
        resource: 'claim',
        resourceId: claim.id,
        ipAddress: SEED_IP,
        userAgent: SEED_UA,
      },
    })

    // 4. Apply transitions
    let currentStatus: string = 'DRAFT'
    if (input.transitions) {
      for (const transition of input.transitions) {
        const fromStatus = currentStatus

        await tx.claim.update({
          where: { id: claim.id },
          data: { status: transition.toStatus, updatedById: input.createdById },
        })

        await tx.claimHistory.create({
          data: {
            claimId: claim.id,
            fromStatus: fromStatus as
              | 'DRAFT'
              | 'IN_REVIEW'
              | 'SUBMITTED'
              | 'PENDING_INFO'
              | 'RETURNED'
              | 'CANCELLED'
              | 'SETTLED',
            toStatus: transition.toStatus,
            reason: transition.reason ?? null,
            notes: transition.notes ?? null,
            createdById: input.createdById,
          },
        })

        await tx.auditLog.create({
          data: {
            userId: input.createdById,
            orgId: input.orgId,
            action: 'claim.transitioned',
            resource: 'claim',
            resourceId: claim.id,
            ipAddress: SEED_IP,
            userAgent: SEED_UA,
          },
        })

        currentStatus = transition.toStatus
      }
    }

    // 5. Create invoices
    if (input.invoices) {
      for (const inv of input.invoices) {
        const invoice = await tx.claimInvoice.create({
          data: {
            claimId: claim.id,
            invoiceNumber: inv.invoiceNumber,
            providerName: inv.providerName,
            amountSubmitted: inv.amountSubmitted,
            createdById: input.createdById,
          },
        })

        await tx.auditLog.create({
          data: {
            userId: input.createdById,
            orgId: input.orgId,
            action: 'claim.invoice_created',
            resource: 'claim',
            resourceId: claim.id,
            metadata: {
              invoiceId: invoice.id,
              invoiceNumber: inv.invoiceNumber,
            },
            ipAddress: SEED_IP,
            userAgent: SEED_UA,
          },
        })
      }
    }

    return claim.id
  })
}

// ── Org 1: Aseguradora Nacional ──────────────────────────────────────

async function seedOrg1(insurers: {
  sura: { id: string }
  bolivar: { id: string }
}) {
  // ── Organization ───────────────────────────────────────────────────
  const org = await prisma.organization.create({
    data: {
      name: 'Aseguradora Nacional',
      slug: slugify('Aseguradora Nacional')!,
    },
  })

  // ── Users ──────────────────────────────────────────────────────────
  const ownerId = await createUser(
    'owner@test.com',
    ROLES.OWNER,
    org.id,
    'Oscar',
    'Owner',
  )
  const adminAlphaId = await createUser(
    'admin-alpha@test.com',
    ROLES.ADMIN,
    org.id,
    'Andrea',
    'Alpha',
  )
  const adminMultiId = await createUser(
    'admin-multi@test.com',
    ROLES.ADMIN,
    org.id,
    'Alberto',
    'Multi',
  )
  const memberCarlosId = await createUser(
    'member-carlos@test.com',
    ROLES.MEMBER,
    org.id,
    'Carlos',
    'Perez',
  )
  const memberMariaId = await createUser(
    'member-maria@test.com',
    ROLES.MEMBER,
    org.id,
    'Maria',
    'Lopez',
  )
  const _nopermsId = await createUser(
    'noperms@test.com',
    'VIEWER',
    org.id,
    'Nadia',
    'Noperm',
  )

  // ── Clients ────────────────────────────────────────────────────────
  const clientAlpha = await prisma.client.create({
    data: { orgId: org.id, name: 'Empresas Alpha S.A.', isActive: true },
  })

  const clientBeta = await prisma.client.create({
    data: { orgId: org.id, name: 'Grupo Beta Ltda.', isActive: true },
  })

  const _clientGamma = await prisma.client.create({
    data: { orgId: org.id, name: 'Gamma Inactiva S.A.', isActive: false },
  })

  // ── UserClient Assignments ─────────────────────────────────────────
  await prisma.userClient.createMany({
    data: [
      { userId: adminAlphaId, clientId: clientAlpha.id },
      { userId: adminMultiId, clientId: clientAlpha.id },
      { userId: adminMultiId, clientId: clientBeta.id },
    ],
  })

  // ── Policies ───────────────────────────────────────────────────────
  const polAlpha1 = await prisma.policy.create({
    data: {
      orgId: org.id,
      clientId: clientAlpha.id,
      insurerId: insurers.sura.id,
      policyNumber: 'POL-ALPHA-001',
      type: 'HEALTH',
      status: 'ACTIVE',
      startDate: new Date('2025-01-01'),
      endDate: new Date('2026-12-31'),
    },
  })

  await prisma.policy.create({
    data: {
      orgId: org.id,
      clientId: clientAlpha.id,
      insurerId: insurers.bolivar.id,
      policyNumber: 'POL-ALPHA-002',
      type: 'ACCIDENTS',
      status: 'EXPIRED',
      startDate: new Date('2023-01-01'),
      endDate: new Date('2024-12-31'),
    },
  })

  const polBeta1 = await prisma.policy.create({
    data: {
      orgId: org.id,
      clientId: clientBeta.id,
      insurerId: insurers.sura.id,
      policyNumber: 'POL-BETA-001',
      type: 'LIFE',
      status: 'ACTIVE',
      startDate: new Date('2025-06-01'),
      endDate: new Date('2027-05-31'),
    },
  })

  await prisma.policy.create({
    data: {
      orgId: org.id,
      clientId: clientBeta.id,
      insurerId: insurers.bolivar.id,
      policyNumber: 'POL-BETA-002',
      type: 'HEALTH',
      status: 'SUSPENDED',
      startDate: new Date('2024-01-01'),
      endDate: new Date('2025-12-31'),
    },
  })

  // ── Affiliates — Client Alpha ──────────────────────────────────────
  const carlos = await prisma.affiliate.create({
    data: {
      orgId: org.id,
      clientId: clientAlpha.id,
      firstName: 'Carlos',
      lastName: 'Perez',
      documentType: 'CI',
      documentNumber: 'CI-10010001',
      userId: memberCarlosId,
      isActive: true,
    },
  })

  const sofia = await prisma.affiliate.create({
    data: {
      orgId: org.id,
      clientId: clientAlpha.id,
      firstName: 'Sofia',
      lastName: 'Perez',
      documentType: 'CI',
      documentNumber: 'CI-10010002',
      primaryAffiliateId: carlos.id,
      relationship: 'CHILD',
      isActive: true,
    },
  })

  const ana = await prisma.affiliate.create({
    data: {
      orgId: org.id,
      clientId: clientAlpha.id,
      firstName: 'Ana',
      lastName: 'Perez',
      documentType: 'CI',
      documentNumber: 'CI-10010003',
      primaryAffiliateId: carlos.id,
      relationship: 'SPOUSE',
      isActive: true,
    },
  })

  await prisma.affiliate.create({
    data: {
      orgId: org.id,
      clientId: clientAlpha.id,
      firstName: 'Luis',
      lastName: 'Perez',
      documentType: 'CI',
      documentNumber: 'CI-10010004',
      primaryAffiliateId: carlos.id,
      relationship: 'CHILD',
      isActive: false,
    },
  })

  const roberto = await prisma.affiliate.create({
    data: {
      orgId: org.id,
      clientId: clientAlpha.id,
      firstName: 'Roberto',
      lastName: 'Diaz',
      documentType: 'CI',
      documentNumber: 'CI-10020001',
      isActive: true,
    },
  })

  const elena = await prisma.affiliate.create({
    data: {
      orgId: org.id,
      clientId: clientAlpha.id,
      firstName: 'Elena',
      lastName: 'Diaz',
      documentType: 'CI',
      documentNumber: 'CI-10020002',
      primaryAffiliateId: roberto.id,
      relationship: 'SPOUSE',
      isActive: true,
    },
  })

  // ── Affiliates — Client Beta ───────────────────────────────────────
  const maria = await prisma.affiliate.create({
    data: {
      orgId: org.id,
      clientId: clientBeta.id,
      firstName: 'Maria',
      lastName: 'Lopez',
      documentType: 'CI',
      documentNumber: 'CI-20010001',
      userId: memberMariaId,
      isActive: true,
    },
  })

  const pedro = await prisma.affiliate.create({
    data: {
      orgId: org.id,
      clientId: clientBeta.id,
      firstName: 'Pedro',
      lastName: 'Lopez',
      documentType: 'CI',
      documentNumber: 'CI-20010002',
      primaryAffiliateId: maria.id,
      relationship: 'CHILD',
      isActive: true,
    },
  })

  const juan = await prisma.affiliate.create({
    data: {
      orgId: org.id,
      clientId: clientBeta.id,
      firstName: 'Juan',
      lastName: 'Torres',
      documentType: 'CI',
      documentNumber: 'CI-20020001',
      isActive: true,
    },
  })

  await prisma.affiliate.create({
    data: {
      orgId: org.id,
      clientId: clientBeta.id,
      firstName: 'Camila',
      lastName: 'Vega',
      documentType: 'CI',
      documentNumber: 'CI-20030001',
      isActive: false,
    },
  })

  // ── Affiliates — Client Gamma (inactive) ───────────────────────────
  await prisma.affiliate.create({
    data: {
      orgId: org.id,
      clientId: _clientGamma.id,
      firstName: 'Gabriel',
      lastName: 'Ramos',
      isActive: true,
    },
  })

  // ── Claims ─────────────────────────────────────────────────────────

  // Claim 1: DRAFT — Carlos→Carlos, core fields filled
  await seedClaim({
    orgId: org.id,
    clientId: clientAlpha.id,
    affiliateId: carlos.id,
    patientId: carlos.id,
    description: 'Consulta medica ambulatoria - dolor de espalda persistente',
    createdById: ownerId,
    policyId: polAlpha1.id,
    careType: 'AMBULATORY',
    diagnosis: 'Lumbalgia cronica M54.5',
    incidentDate: new Date('2026-01-15'),
  })

  // Claim 2: DRAFT — Carlos→Sofia, minimal (bare DRAFT)
  await seedClaim({
    orgId: org.id,
    clientId: clientAlpha.id,
    affiliateId: carlos.id,
    patientId: sofia.id,
    description: 'Consulta pediatrica de rutina',
    createdById: ownerId,
  })

  // Claim 3: IN_REVIEW — Carlos→Ana, core + partial submission
  await seedClaim({
    orgId: org.id,
    clientId: clientAlpha.id,
    affiliateId: carlos.id,
    patientId: ana.id,
    description: 'Examen oftalmologico anual',
    createdById: ownerId,
    policyId: polAlpha1.id,
    careType: 'AMBULATORY',
    diagnosis: 'Miopia H52.1',
    incidentDate: new Date('2026-01-20'),
    amountSubmitted: '350000.00',
    transitions: [{ toStatus: 'IN_REVIEW' }],
  })

  // Claim 4: SUBMITTED — Roberto→Roberto, core + submission complete, invoices
  await seedClaim({
    orgId: org.id,
    clientId: clientAlpha.id,
    affiliateId: roberto.id,
    patientId: roberto.id,
    description: 'Cirugia de rodilla - menisco lateral',
    createdById: ownerId,
    policyId: polAlpha1.id,
    careType: 'HOSPITALARY',
    diagnosis: 'Lesion de menisco M23.2',
    incidentDate: new Date('2025-12-01'),
    amountSubmitted: '8500000.00',
    submittedDate: new Date('2026-01-10'),
    transitions: [{ toStatus: 'IN_REVIEW' }, { toStatus: 'SUBMITTED' }],
    invoices: [
      {
        invoiceNumber: 'INV-2026-001',
        providerName: 'Clinica del Country',
        amountSubmitted: '5000000.00',
      },
      {
        invoiceNumber: 'INV-2026-002',
        providerName: 'Laboratorio Colcan',
        amountSubmitted: '1500000.00',
      },
      {
        invoiceNumber: 'INV-2026-003',
        providerName: 'Farmacia Cruz Verde',
        amountSubmitted: '2000000.00',
      },
    ],
  })

  // Claim 5: PENDING_INFO — Roberto→Elena, core + submission, needs more info
  await seedClaim({
    orgId: org.id,
    clientId: clientAlpha.id,
    affiliateId: roberto.id,
    patientId: elena.id,
    description: 'Atencion de urgencias - reaccion alergica severa',
    createdById: ownerId,
    policyId: polAlpha1.id,
    careType: 'HOSPITALARY',
    diagnosis: 'Anafilaxia T78.2',
    incidentDate: new Date('2026-01-05'),
    amountSubmitted: '3200000.00',
    submittedDate: new Date('2026-01-12'),
    transitions: [
      { toStatus: 'IN_REVIEW' },
      { toStatus: 'SUBMITTED' },
      {
        toStatus: 'PENDING_INFO',
        reason: 'Falta epicrisis y orden de hospitalizacion',
      },
    ],
    invoices: [
      {
        invoiceNumber: 'INV-2026-010',
        providerName: 'Hospital San Jose',
        amountSubmitted: '3200000.00',
      },
    ],
  })

  // Claim 6: RETURNED — Carlos→Carlos, DRAFT→IN_REVIEW→RETURNED
  await seedClaim({
    orgId: org.id,
    clientId: clientAlpha.id,
    affiliateId: carlos.id,
    patientId: carlos.id,
    description: 'Tratamiento odontologico - endodoncia',
    createdById: ownerId,
    policyId: polAlpha1.id,
    careType: 'AMBULATORY',
    diagnosis: 'Pulpitis irreversible K04.0',
    incidentDate: new Date('2025-11-20'),
    transitions: [
      { toStatus: 'IN_REVIEW' },
      {
        toStatus: 'RETURNED',
        reason: 'Procedimiento no cubierto por el plan de salud contratado',
      },
    ],
  })

  // Claim 7: SETTLED — Roberto→Roberto, ALL fields filled
  await seedClaim({
    orgId: org.id,
    clientId: clientAlpha.id,
    affiliateId: roberto.id,
    patientId: roberto.id,
    description: 'Terapia fisica post-operatoria - 12 sesiones',
    createdById: ownerId,
    policyId: polAlpha1.id,
    careType: 'AMBULATORY',
    diagnosis: 'Rehabilitacion post-quirurgica Z96.6',
    incidentDate: new Date('2025-10-01'),
    amountSubmitted: '4800000.00',
    submittedDate: new Date('2025-11-01'),
    amountApproved: '4200000.00',
    amountDenied: '300000.00',
    amountUnprocessed: '300000.00',
    deductibleApplied: '250000.00',
    copayApplied: '150000.00',
    settlementDate: new Date('2025-12-15'),
    settlementNumber: 'SET-2025-0042',
    settlementNotes:
      'Liquidacion aprobada. Se descuenta deducible y copago segun contrato.',
    businessDays: 32,
    transitions: [
      { toStatus: 'IN_REVIEW' },
      { toStatus: 'SUBMITTED' },
      { toStatus: 'SETTLED' },
    ],
    invoices: [
      {
        invoiceNumber: 'INV-2025-050',
        providerName: 'Centro de Rehabilitacion Fisiomed',
        amountSubmitted: '3600000.00',
      },
      {
        invoiceNumber: 'INV-2025-051',
        providerName: 'Farmacia La Rebaja',
        amountSubmitted: '1200000.00',
      },
    ],
  })

  // Claim 8: CANCELLED — Carlos→Sofia, DRAFT→CANCELLED
  await seedClaim({
    orgId: org.id,
    clientId: clientAlpha.id,
    affiliateId: carlos.id,
    patientId: sofia.id,
    description: 'Vacunacion de refuerzo - cancelada por duplicado',
    createdById: ownerId,
    transitions: [
      {
        toStatus: 'CANCELLED',
        reason: 'Reclamo duplicado, ya procesado en reclamo anterior',
      },
    ],
  })

  // Claim 9: DRAFT — Maria→Pedro (Beta), for member-maria scope
  await seedClaim({
    orgId: org.id,
    clientId: clientBeta.id,
    affiliateId: maria.id,
    patientId: pedro.id,
    description: 'Control pediatrico anual - revision general',
    createdById: ownerId,
  })

  // Claim 10: SUBMITTED — Juan→Juan (Beta), admin-multi can see, admin-alpha cannot
  await seedClaim({
    orgId: org.id,
    clientId: clientBeta.id,
    affiliateId: juan.id,
    patientId: juan.id,
    description: 'Examen medico ocupacional periodico',
    createdById: ownerId,
    policyId: polBeta1.id,
    careType: 'AMBULATORY',
    diagnosis: 'Examen medico general Z00.0',
    incidentDate: new Date('2026-01-25'),
    amountSubmitted: '450000.00',
    submittedDate: new Date('2026-01-28'),
    transitions: [{ toStatus: 'IN_REVIEW' }, { toStatus: 'SUBMITTED' }],
    invoices: [
      {
        invoiceNumber: 'INV-2026-020',
        providerName: 'IPS Salud Total',
        amountSubmitted: '450000.00',
      },
    ],
  })
}

// ── Org 2: Seguros del Pacifico ──────────────────────────────────────

async function seedOrg2() {
  const org = await prisma.organization.create({
    data: {
      name: 'Seguros del Pacifico',
      slug: slugify('Seguros del Pacifico')!,
    },
  })

  const ownerId = await createUser(
    'owner2@test.com',
    ROLES.OWNER,
    org.id,
    'Patricia',
    'Pacifico',
  )

  const client = await prisma.client.create({
    data: { orgId: org.id, name: 'Delta Corp', isActive: true },
  })

  const fernando = await prisma.affiliate.create({
    data: {
      orgId: org.id,
      clientId: client.id,
      firstName: 'Fernando',
      lastName: 'Ruiz',
      documentType: 'CI',
      documentNumber: 'CI-30010001',
      isActive: true,
    },
  })

  await seedClaim({
    orgId: org.id,
    clientId: client.id,
    affiliateId: fernando.id,
    patientId: fernando.id,
    description: 'Consulta medica general - chequeo preventivo',
    createdById: ownerId,
  })
}

// ── Summary ──────────────────────────────────────────────────────────

async function printSummary() {
  const [
    users,
    orgs,
    clients,
    affiliates,
    policies,
    claims,
    history,
    invoices,
    auditLogs,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.organization.count(),
    prisma.client.count(),
    prisma.affiliate.count(),
    prisma.policy.count(),
    prisma.claim.count(),
    prisma.claimHistory.count(),
    prisma.claimInvoice.count(),
    prisma.auditLog.count(),
  ])

  console.log('\n' + '='.repeat(60))
  console.log('  SEED COMPLETE')
  console.log('='.repeat(60))
  console.log('')
  console.log('  Entity Counts:')
  console.log(`    Organizations:   ${orgs}`)
  console.log(`    Users:           ${users}`)
  console.log(`    Clients:         ${clients}`)
  console.log(`    Affiliates:      ${affiliates}`)
  console.log(`    Policies:        ${policies}`)
  console.log(`    Claims:          ${claims}`)
  console.log(`    Claim History:   ${history}`)
  console.log(`    Claim Invoices:  ${invoices}`)
  console.log(`    Audit Logs:      ${auditLogs}`)
  console.log('')
  console.log('  Login Credentials (all use password: Password123!):')
  console.log('  ┌────────────────────────────┬────────┬─────────┐')
  console.log('  │ Email                      │ Role   │ Scope   │')
  console.log('  ├────────────────────────────┼────────┼─────────┤')
  console.log('  │ owner@test.com             │ OWNER  │ all     │')
  console.log('  │ admin-alpha@test.com       │ ADMIN  │ client  │')
  console.log('  │ admin-multi@test.com       │ ADMIN  │ client  │')
  console.log('  │ member-carlos@test.com     │ MEMBER │ own     │')
  console.log('  │ member-maria@test.com      │ MEMBER │ own     │')
  console.log('  │ noperms@test.com           │ VIEWER │ none    │')
  console.log('  │ owner2@test.com            │ OWNER  │ all     │')
  console.log('  └────────────────────────────┴────────┴─────────┘')
  console.log('')
  console.log('  Notes:')
  console.log('    - admin-alpha: assigned to Empresas Alpha S.A. only')
  console.log('    - admin-multi: assigned to Alpha + Beta')
  console.log('    - member-carlos: linked to Carlos Perez (Alpha)')
  console.log('    - member-maria: linked to Maria Lopez (Beta)')
  console.log('    - noperms: zero claims permissions (403 on everything)')
  console.log('    - owner2: separate org (Seguros del Pacifico)')
  console.log('')
  console.log('='.repeat(60))
}

// ── Main ─────────────────────────────────────────────────────────────

async function main() {
  console.log('Truncating all tables...')
  await truncateAll()

  console.log('Seeding roles and permissions...')
  await seedRolesAndPerms()

  console.log('Seeding insurers...')
  const insurers = await seedInsurers()

  console.log('Seeding Org 1: Aseguradora Nacional...')
  await seedOrg1(insurers)

  console.log('Seeding Org 2: Seguros del Pacifico...')
  await seedOrg2()

  await printSummary()
}

main()
  .catch((err) => {
    console.error('Seed failed:', err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
