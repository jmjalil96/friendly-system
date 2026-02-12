import { z } from 'zod'

export const claimStatusSchema = z.enum([
  'DRAFT',
  'SUBMITTED',
  'IN_REVIEW',
  'PENDING_INFO',
  'RETURNED',
  'CANCELLED',
  'SETTLED',
])

export type ClaimStatus = z.infer<typeof claimStatusSchema>

export const careTypeSchema = z.enum(['AMBULATORY', 'HOSPITALARY', 'OTHER'])

export type CareType = z.infer<typeof careTypeSchema>

const noNullBytes = (s: string) => !s.includes('\0')
const NULL_BYTE_MSG = 'Invalid characters'

export const createClaimSchema = z.object({
  clientId: z.string().uuid(),
  affiliateId: z.string().uuid(),
  patientId: z.string().uuid(),
  description: z
    .string()
    .trim()
    .min(1)
    .max(5000)
    .refine(noNullBytes, NULL_BYTE_MSG),
})

export type CreateClaimInput = z.infer<typeof createClaimSchema>

export const createClaimResponseSchema = z.object({
  id: z.string().uuid(),
  claimNumber: z.number().int(),
  status: z.literal('DRAFT'),
  clientId: z.string().uuid(),
  affiliateId: z.string().uuid(),
  patientId: z.string().uuid(),
  description: z.string(),
  createdAt: z.string(),
})

export type CreateClaimResponse = z.infer<typeof createClaimResponseSchema>

export const getClaimByIdParamsSchema = z.object({
  id: z.string().uuid(),
})

export const getClaimByIdResponseSchema = z.object({
  id: z.string().uuid(),
  claimNumber: z.number().int(),
  status: claimStatusSchema,
  clientId: z.string().uuid(),
  clientName: z.string(),
  affiliateId: z.string().uuid(),
  affiliateFirstName: z.string(),
  affiliateLastName: z.string(),
  patientId: z.string().uuid(),
  patientFirstName: z.string(),
  patientLastName: z.string(),
  policyId: z.string().uuid().nullable(),
  policyNumber: z.string().nullable(),
  policyInsurerName: z.string().nullable(),
  description: z.string(),
  careType: careTypeSchema.nullable(),
  diagnosis: z.string().nullable(),
  amountSubmitted: z.string().nullable(),
  amountApproved: z.string().nullable(),
  amountDenied: z.string().nullable(),
  amountUnprocessed: z.string().nullable(),
  deductibleApplied: z.string().nullable(),
  copayApplied: z.string().nullable(),
  incidentDate: z.string().nullable(),
  submittedDate: z.string().nullable(),
  settlementDate: z.string().nullable(),
  businessDays: z.number().int().nullable(),
  settlementNumber: z.string().nullable(),
  settlementNotes: z.string().nullable(),
  createdById: z.string().uuid(),
  updatedById: z.string().uuid().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export type GetClaimByIdResponse = z.infer<typeof getClaimByIdResponseSchema>

export const listClaimsQuerySchema = z
  .object({
    status: z
      .union([z.string(), z.array(z.string())])
      .transform((v) => (Array.isArray(v) ? v : [v]))
      .pipe(z.array(claimStatusSchema))
      .optional(),
    search: z.string().trim().max(200).optional(),
    dateFrom: z.string().date().optional(),
    dateTo: z.string().date().optional(),
    sortBy: z
      .enum(['createdAt', 'claimNumber', 'updatedAt'])
      .default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
    page: z.coerce.number().int().min(1).max(1000).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  })
  .refine(
    (data) => !data.dateFrom || !data.dateTo || data.dateFrom <= data.dateTo,
    {
      message: 'dateFrom must not be after dateTo',
      path: ['dateFrom'],
    },
  )

export type ListClaimsQuery = z.infer<typeof listClaimsQuerySchema>

export const listClaimsItemSchema = z.object({
  id: z.string().uuid(),
  claimNumber: z.number().int(),
  status: claimStatusSchema,
  clientId: z.string().uuid(),
  clientName: z.string(),
  affiliateId: z.string().uuid(),
  affiliateFirstName: z.string(),
  affiliateLastName: z.string(),
  patientId: z.string().uuid(),
  patientFirstName: z.string(),
  patientLastName: z.string(),
  description: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export type ListClaimsItem = z.infer<typeof listClaimsItemSchema>

export const listClaimsResponseSchema = z.object({
  data: z.array(listClaimsItemSchema),
  meta: z.object({
    page: z.number().int(),
    limit: z.number().int(),
    totalCount: z.number().int(),
    totalPages: z.number().int(),
  }),
})

export type ListClaimsResponse = z.infer<typeof listClaimsResponseSchema>

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

const dependentRelationshipSchema = z
  .enum(['SPOUSE', 'CHILD', 'PARENT', 'SIBLING', 'OTHER'])
  .nullable()

const policyTypeSchema = z.enum(['HEALTH', 'LIFE', 'ACCIDENTS']).nullable()

const policyStatusSchema = z.enum([
  'PENDING',
  'ACTIVE',
  'SUSPENDED',
  'EXPIRED',
  'CANCELLED',
])

export const lookupClientsQuerySchema = lookupPaginatedQuerySchema

export type LookupClientsQuery = z.infer<typeof lookupClientsQuerySchema>

export const lookupClientsItemSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
})

export const lookupClientsResponseSchema = z.object({
  data: z.array(lookupClientsItemSchema),
  meta: lookupMetaSchema,
})

export type LookupClientsResponse = z.infer<typeof lookupClientsResponseSchema>

export const lookupClientAffiliatesParamsSchema = z.object({
  clientId: z.string().uuid(),
})

export const lookupClientAffiliatesQuerySchema = lookupPaginatedQuerySchema

export type LookupClientAffiliatesQuery = z.infer<
  typeof lookupClientAffiliatesQuerySchema
>

export const lookupClientAffiliatesItemSchema = z.object({
  id: z.string().uuid(),
  firstName: z.string(),
  lastName: z.string(),
  documentType: z.string().nullable(),
  documentNumber: z.string().nullable(),
})

export const lookupClientAffiliatesResponseSchema = z.object({
  data: z.array(lookupClientAffiliatesItemSchema),
  meta: lookupMetaSchema,
})

export type LookupClientAffiliatesResponse = z.infer<
  typeof lookupClientAffiliatesResponseSchema
>

export const lookupAffiliatePatientsParamsSchema = z.object({
  affiliateId: z.string().uuid(),
})

export const lookupAffiliatePatientsItemSchema = z.object({
  id: z.string().uuid(),
  firstName: z.string(),
  lastName: z.string(),
  relationship: dependentRelationshipSchema,
  documentType: z.string().nullable(),
  documentNumber: z.string().nullable(),
})

export const lookupAffiliatePatientsResponseSchema = z.object({
  data: z.array(lookupAffiliatePatientsItemSchema),
})

export type LookupAffiliatePatientsResponse = z.infer<
  typeof lookupAffiliatePatientsResponseSchema
>

export const lookupClientPoliciesParamsSchema = z.object({
  clientId: z.string().uuid(),
})

export const lookupClientPoliciesQuerySchema = lookupPaginatedQuerySchema

export type LookupClientPoliciesQuery = z.infer<
  typeof lookupClientPoliciesQuerySchema
>

export const lookupClientPoliciesItemSchema = z.object({
  id: z.string().uuid(),
  policyNumber: z.string(),
  type: policyTypeSchema,
  status: policyStatusSchema,
  startDate: z.string(),
  endDate: z.string(),
  insurerName: z.string(),
})

export const lookupClientPoliciesResponseSchema = z.object({
  data: z.array(lookupClientPoliciesItemSchema),
  meta: lookupMetaSchema,
})

export type LookupClientPoliciesResponse = z.infer<
  typeof lookupClientPoliciesResponseSchema
>

export const updateClaimParamsSchema = z.object({
  id: z.string().uuid(),
})

const decimalString = z
  .string()
  .regex(/^\d{1,10}(\.\d{1,2})?$/, 'Invalid decimal format')

export const updateClaimSchema = z
  .object({
    policyId: z.string().uuid().nullable().optional(),
    description: z
      .string()
      .trim()
      .min(1)
      .max(5000)
      .refine(noNullBytes, NULL_BYTE_MSG)
      .optional(),
    careType: careTypeSchema.nullable().optional(),
    diagnosis: z
      .string()
      .trim()
      .max(500)
      .refine(noNullBytes, NULL_BYTE_MSG)
      .nullable()
      .optional(),
    incidentDate: z.string().date().nullable().optional(),
    amountSubmitted: decimalString.nullable().optional(),
    submittedDate: z.string().date().nullable().optional(),
    amountApproved: decimalString.nullable().optional(),
    amountDenied: decimalString.nullable().optional(),
    amountUnprocessed: decimalString.nullable().optional(),
    deductibleApplied: decimalString.nullable().optional(),
    copayApplied: decimalString.nullable().optional(),
    settlementDate: z.string().date().nullable().optional(),
    settlementNumber: z
      .string()
      .trim()
      .max(100)
      .refine(noNullBytes, NULL_BYTE_MSG)
      .nullable()
      .optional(),
    settlementNotes: z
      .string()
      .trim()
      .max(5000)
      .refine(noNullBytes, NULL_BYTE_MSG)
      .nullable()
      .optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  })

export type UpdateClaimInput = z.infer<typeof updateClaimSchema>

export const transitionClaimParamsSchema = z.object({
  id: z.string().uuid(),
})

export const transitionClaimSchema = z.object({
  status: claimStatusSchema,
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

export type TransitionClaimInput = z.infer<typeof transitionClaimSchema>

export const deleteClaimParamsSchema = z.object({
  id: z.string().uuid(),
})

export const deleteClaimResponseSchema = z.object({
  message: z.literal('Claim deleted'),
})

export type DeleteClaimResponse = z.infer<typeof deleteClaimResponseSchema>

export const claimHistoryParamsSchema = z.object({
  id: z.string().uuid(),
})

export const claimHistoryQuerySchema = paginatedQuerySchema

export type ClaimHistoryQuery = z.infer<typeof claimHistoryQuerySchema>

export const claimHistoryItemSchema = z.object({
  id: z.string().uuid(),
  claimId: z.string().uuid(),
  fromStatus: claimStatusSchema.nullable(),
  toStatus: claimStatusSchema,
  reason: z.string().nullable(),
  notes: z.string().nullable(),
  createdById: z.string().uuid(),
  createdByFirstName: z.string().nullable(),
  createdByLastName: z.string().nullable(),
  createdAt: z.string(),
})

export const claimHistoryResponseSchema = z.object({
  data: z.array(claimHistoryItemSchema),
  meta: lookupMetaSchema,
})

export type ClaimHistoryResponse = z.infer<typeof claimHistoryResponseSchema>

export const claimTimelineParamsSchema = z.object({
  id: z.string().uuid(),
})

export const claimTimelineQuerySchema = paginatedQuerySchema

export type ClaimTimelineQuery = z.infer<typeof claimTimelineQuerySchema>

const claimTimelineActionSchema = z.enum([
  'claim.created',
  'claim.updated',
  'claim.transitioned',
  'claim.deleted',
  'claim.invoice_created',
  'claim.invoice_updated',
  'claim.invoice_deleted',
])

export const claimTimelineItemSchema = z.object({
  id: z.string().uuid(),
  action: claimTimelineActionSchema,
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

export const claimTimelineResponseSchema = z.object({
  data: z.array(claimTimelineItemSchema),
  meta: lookupMetaSchema,
})

export type ClaimTimelineResponse = z.infer<typeof claimTimelineResponseSchema>

export const claimInvoicesParamsSchema = z.object({
  id: z.string().uuid(),
})

export const claimInvoiceByIdParamsSchema = z.object({
  id: z.string().uuid(),
  invoiceId: z.string().uuid(),
})

export const claimInvoicesQuerySchema = paginatedQuerySchema

export type ClaimInvoicesQuery = z.infer<typeof claimInvoicesQuerySchema>

export const createClaimInvoiceSchema = z.object({
  invoiceNumber: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .refine(noNullBytes, NULL_BYTE_MSG),
  providerName: z
    .string()
    .trim()
    .min(1)
    .max(255)
    .refine(noNullBytes, NULL_BYTE_MSG),
  amountSubmitted: decimalString,
})

export type CreateClaimInvoiceInput = z.infer<typeof createClaimInvoiceSchema>

export const updateClaimInvoiceSchema = z
  .object({
    invoiceNumber: z
      .string()
      .trim()
      .min(1)
      .max(100)
      .refine(noNullBytes, NULL_BYTE_MSG)
      .optional(),
    providerName: z
      .string()
      .trim()
      .min(1)
      .max(255)
      .refine(noNullBytes, NULL_BYTE_MSG)
      .optional(),
    amountSubmitted: decimalString.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  })

export type UpdateClaimInvoiceInput = z.infer<typeof updateClaimInvoiceSchema>

export const claimInvoiceItemSchema = z.object({
  id: z.string().uuid(),
  claimId: z.string().uuid(),
  invoiceNumber: z.string(),
  providerName: z.string(),
  amountSubmitted: z.string(),
  createdById: z.string().uuid(),
  createdAt: z.string(),
})

export const claimInvoiceResponseSchema = claimInvoiceItemSchema

export type ClaimInvoiceResponse = z.infer<typeof claimInvoiceResponseSchema>

export const claimInvoicesResponseSchema = z.object({
  data: z.array(claimInvoiceItemSchema),
  meta: lookupMetaSchema,
})

export type ClaimInvoicesResponse = z.infer<typeof claimInvoicesResponseSchema>

export const deleteClaimInvoiceResponseSchema = z.object({
  message: z.literal('Claim invoice deleted'),
})

export type DeleteClaimInvoiceResponse = z.infer<
  typeof deleteClaimInvoiceResponseSchema
>
