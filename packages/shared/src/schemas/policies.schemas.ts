import { z } from 'zod'

const noNullBytes = (s: string) => !s.includes('\0')
const NULL_BYTE_MSG = 'Invalid characters'

const paginatedQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(1000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

const lookupMetaSchema = z.object({
  page: z.number().int(),
  limit: z.number().int(),
  totalCount: z.number().int(),
  totalPages: z.number().int(),
})

const lookupPaginatedQuerySchema = paginatedQuerySchema.extend({
  search: z.string().trim().max(200).optional(),
})

const decimalString = z
  .string()
  .regex(/^\d{1,10}(\.\d{1,2})?$/, 'Invalid decimal format')

export const policyStatusSchema = z.enum([
  'PENDING',
  'ACTIVE',
  'SUSPENDED',
  'EXPIRED',
  'CANCELLED',
])

export type PolicyStatus = z.infer<typeof policyStatusSchema>

export const policyTypeSchema = z
  .enum(['HEALTH', 'LIFE', 'ACCIDENTS'])
  .nullable()

export type PolicyType = z.infer<typeof policyTypeSchema>

export const createPolicySchema = z
  .object({
    clientId: z.string().uuid(),
    insurerId: z.string().uuid(),
    policyNumber: z
      .string()
      .trim()
      .min(1)
      .max(100)
      .refine(noNullBytes, NULL_BYTE_MSG),
    type: policyTypeSchema.optional(),
    startDate: z.string().date(),
    endDate: z.string().date(),
    ambulatoryCoinsurancePct: decimalString.nullable().optional(),
    hospitalaryCoinsurancePct: decimalString.nullable().optional(),
    maternityCost: decimalString.nullable().optional(),
    tPremium: decimalString.nullable().optional(),
    tplus1Premium: decimalString.nullable().optional(),
    tplusfPremium: decimalString.nullable().optional(),
    benefitsCostPerPerson: decimalString.nullable().optional(),
    maxCoverage: decimalString.nullable().optional(),
    deductible: decimalString.nullable().optional(),
    planName: z
      .string()
      .trim()
      .min(1)
      .max(255)
      .refine(noNullBytes, NULL_BYTE_MSG)
      .nullable()
      .optional(),
    employeeClass: z
      .string()
      .trim()
      .min(1)
      .max(100)
      .refine(noNullBytes, NULL_BYTE_MSG)
      .nullable()
      .optional(),
  })
  .refine((data) => data.startDate <= data.endDate, {
    message: 'startDate must not be after endDate',
    path: ['startDate'],
  })

export type CreatePolicyInput = z.infer<typeof createPolicySchema>

export const createPolicyResponseSchema = z.object({
  id: z.string().uuid(),
  policyNumber: z.string(),
  status: z.literal('PENDING'),
  clientId: z.string().uuid(),
  insurerId: z.string().uuid(),
  type: policyTypeSchema,
  startDate: z.string(),
  endDate: z.string(),
  createdAt: z.string(),
})

export type CreatePolicyResponse = z.infer<typeof createPolicyResponseSchema>

export const getPolicyByIdParamsSchema = z.object({
  id: z.string().uuid(),
})

export const getPolicyByIdResponseSchema = z.object({
  id: z.string().uuid(),
  policyNumber: z.string(),
  status: policyStatusSchema,
  clientId: z.string().uuid(),
  clientName: z.string(),
  insurerId: z.string().uuid(),
  insurerName: z.string(),
  type: policyTypeSchema,
  startDate: z.string(),
  endDate: z.string(),
  ambulatoryCoinsurancePct: z.string().nullable(),
  hospitalaryCoinsurancePct: z.string().nullable(),
  maternityCost: z.string().nullable(),
  tPremium: z.string().nullable(),
  tplus1Premium: z.string().nullable(),
  tplusfPremium: z.string().nullable(),
  benefitsCostPerPerson: z.string().nullable(),
  maxCoverage: z.string().nullable(),
  deductible: z.string().nullable(),
  planName: z.string().nullable(),
  employeeClass: z.string().nullable(),
  cancellationReason: z.string().nullable(),
  cancelledAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export type GetPolicyByIdResponse = z.infer<typeof getPolicyByIdResponseSchema>

export const listPoliciesQuerySchema = z.object({
  status: z
    .union([z.string(), z.array(z.string())])
    .transform((v) => (Array.isArray(v) ? v : [v]))
    .pipe(z.array(policyStatusSchema))
    .optional(),
  search: z.string().trim().max(200).optional(),
  sortBy: z
    .enum(['createdAt', 'policyNumber', 'updatedAt'])
    .default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  page: z.coerce.number().int().min(1).max(1000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export type ListPoliciesQuery = z.infer<typeof listPoliciesQuerySchema>

export const listPoliciesItemSchema = z.object({
  id: z.string().uuid(),
  policyNumber: z.string(),
  status: policyStatusSchema,
  clientId: z.string().uuid(),
  clientName: z.string(),
  insurerId: z.string().uuid(),
  insurerName: z.string(),
  type: policyTypeSchema,
  planName: z.string().nullable(),
  employeeClass: z.string().nullable(),
  maxCoverage: z.string().nullable(),
  deductible: z.string().nullable(),
  startDate: z.string(),
  endDate: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export type ListPoliciesItem = z.infer<typeof listPoliciesItemSchema>

export const listPoliciesResponseSchema = z.object({
  data: z.array(listPoliciesItemSchema),
  meta: lookupMetaSchema,
})

export type ListPoliciesResponse = z.infer<typeof listPoliciesResponseSchema>

export const lookupPolicyClientsQuerySchema = lookupPaginatedQuerySchema

export type LookupPolicyClientsQuery = z.infer<
  typeof lookupPolicyClientsQuerySchema
>

export const lookupPolicyClientsItemSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
})

export const lookupPolicyClientsResponseSchema = z.object({
  data: z.array(lookupPolicyClientsItemSchema),
  meta: lookupMetaSchema,
})

export type LookupPolicyClientsResponse = z.infer<
  typeof lookupPolicyClientsResponseSchema
>

export const lookupPolicyInsurersQuerySchema = lookupPaginatedQuerySchema

export type LookupPolicyInsurersQuery = z.infer<
  typeof lookupPolicyInsurersQuerySchema
>

export const lookupPolicyInsurersItemSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
})

export const lookupPolicyInsurersResponseSchema = z.object({
  data: z.array(lookupPolicyInsurersItemSchema),
  meta: lookupMetaSchema,
})

export type LookupPolicyInsurersResponse = z.infer<
  typeof lookupPolicyInsurersResponseSchema
>

export const updatePolicyParamsSchema = z.object({
  id: z.string().uuid(),
})

export const updatePolicySchema = z
  .object({
    clientId: z.string().uuid().optional(),
    insurerId: z.string().uuid().optional(),
    policyNumber: z
      .string()
      .trim()
      .min(1)
      .max(100)
      .refine(noNullBytes, NULL_BYTE_MSG)
      .optional(),
    type: policyTypeSchema.optional(),
    startDate: z.string().date().optional(),
    endDate: z.string().date().optional(),
    ambulatoryCoinsurancePct: decimalString.nullable().optional(),
    hospitalaryCoinsurancePct: decimalString.nullable().optional(),
    maternityCost: decimalString.nullable().optional(),
    tPremium: decimalString.nullable().optional(),
    tplus1Premium: decimalString.nullable().optional(),
    tplusfPremium: decimalString.nullable().optional(),
    benefitsCostPerPerson: decimalString.nullable().optional(),
    maxCoverage: decimalString.nullable().optional(),
    deductible: decimalString.nullable().optional(),
    planName: z
      .string()
      .trim()
      .min(1)
      .max(255)
      .refine(noNullBytes, NULL_BYTE_MSG)
      .nullable()
      .optional(),
    employeeClass: z
      .string()
      .trim()
      .min(1)
      .max(100)
      .refine(noNullBytes, NULL_BYTE_MSG)
      .nullable()
      .optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  })
  .refine(
    (data) =>
      !data.startDate || !data.endDate || data.startDate <= data.endDate,
    {
      message: 'startDate must not be after endDate',
      path: ['startDate'],
    },
  )

export type UpdatePolicyInput = z.infer<typeof updatePolicySchema>

export const transitionPolicyParamsSchema = z.object({
  id: z.string().uuid(),
})

export const transitionPolicySchema = z.object({
  status: policyStatusSchema,
  reason: z
    .string()
    .trim()
    .min(1)
    .max(500)
    .refine(noNullBytes, NULL_BYTE_MSG)
    .optional(),
  notes: z
    .string()
    .trim()
    .max(5000)
    .refine(noNullBytes, NULL_BYTE_MSG)
    .optional(),
})

export type TransitionPolicyInput = z.infer<typeof transitionPolicySchema>

export const deletePolicyParamsSchema = z.object({
  id: z.string().uuid(),
})

export const deletePolicyResponseSchema = z.object({
  message: z.literal('Policy deleted'),
})

export type DeletePolicyResponse = z.infer<typeof deletePolicyResponseSchema>

export const policyHistoryParamsSchema = z.object({
  id: z.string().uuid(),
})

export const policyHistoryQuerySchema = paginatedQuerySchema

export type PolicyHistoryQuery = z.infer<typeof policyHistoryQuerySchema>

export const policyHistoryItemSchema = z.object({
  id: z.string().uuid(),
  policyId: z.string().uuid(),
  fromStatus: policyStatusSchema.nullable(),
  toStatus: policyStatusSchema,
  reason: z.string().nullable(),
  notes: z.string().nullable(),
  createdById: z.string().uuid(),
  createdByFirstName: z.string().nullable(),
  createdByLastName: z.string().nullable(),
  createdAt: z.string(),
})

export const policyHistoryResponseSchema = z.object({
  data: z.array(policyHistoryItemSchema),
  meta: lookupMetaSchema,
})

export type PolicyHistoryResponse = z.infer<typeof policyHistoryResponseSchema>

export const policyTimelineParamsSchema = z.object({
  id: z.string().uuid(),
})

export const policyTimelineQuerySchema = paginatedQuerySchema

export type PolicyTimelineQuery = z.infer<typeof policyTimelineQuerySchema>

const policyTimelineActionSchema = z.enum([
  'policy.created',
  'policy.updated',
  'policy.transitioned',
  'policy.deleted',
])

export const policyTimelineItemSchema = z.object({
  id: z.string().uuid(),
  action: policyTimelineActionSchema,
  resource: z.string().nullable(),
  resourceId: z.string().uuid().nullable(),
  userId: z.string().uuid().nullable(),
  userFirstName: z.string().nullable(),
  userLastName: z.string().nullable(),
  ipAddress: z.string().nullable(),
  userAgent: z.string().nullable(),
  metadata: z.unknown().nullable(),
  createdAt: z.string(),
})

export const policyTimelineResponseSchema = z.object({
  data: z.array(policyTimelineItemSchema),
  meta: lookupMetaSchema,
})

export type PolicyTimelineResponse = z.infer<
  typeof policyTimelineResponseSchema
>
