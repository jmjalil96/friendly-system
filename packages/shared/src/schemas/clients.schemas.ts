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

const booleanQuerySchema = z.preprocess((value) => {
  if (value === 'true') return true
  if (value === 'false') return false
  return value
}, z.boolean())

const policyTypeSchema = z.enum(['HEALTH', 'LIFE', 'ACCIDENTS']).nullable()

const policyStatusSchema = z.enum([
  'PENDING',
  'ACTIVE',
  'SUSPENDED',
  'EXPIRED',
  'CANCELLED',
])

const clientTimelineActionSchema = z.enum([
  'client.created',
  'client.updated',
  'client.deactivated',
])

export const createClientSchema = z.object({
  name: z.string().trim().min(1).max(255).refine(noNullBytes, NULL_BYTE_MSG),
  isActive: z.boolean().optional(),
})

export type CreateClientInput = z.infer<typeof createClientSchema>

export const createClientResponseSchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  name: z.string(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export type CreateClientResponse = z.infer<typeof createClientResponseSchema>

export const getClientByIdParamsSchema = z.object({
  id: z.string().uuid(),
})

export const getClientByIdResponseSchema = createClientResponseSchema

export type GetClientByIdResponse = z.infer<typeof getClientByIdResponseSchema>

export const listClientsQuerySchema = z.object({
  search: z.string().trim().max(200).optional(),
  isActive: booleanQuerySchema.optional(),
  sortBy: z.enum(['createdAt', 'name', 'updatedAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  page: z.coerce.number().int().min(1).max(1000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export type ListClientsQuery = z.infer<typeof listClientsQuerySchema>

export const listClientsItemSchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  name: z.string(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export type ListClientsItem = z.infer<typeof listClientsItemSchema>

export const listClientsResponseSchema = z.object({
  data: z.array(listClientsItemSchema),
  meta: lookupMetaSchema,
})

export type ListClientsResponse = z.infer<typeof listClientsResponseSchema>

export const updateClientParamsSchema = z.object({
  id: z.string().uuid(),
})

export const updateClientSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1)
      .max(255)
      .refine(noNullBytes, NULL_BYTE_MSG)
      .optional(),
    isActive: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  })

export type UpdateClientInput = z.infer<typeof updateClientSchema>

export const deleteClientParamsSchema = z.object({
  id: z.string().uuid(),
})

export const deleteClientResponseSchema = z.object({
  message: z.literal('Client deactivated'),
})

export type DeleteClientResponse = z.infer<typeof deleteClientResponseSchema>

export const clientTimelineParamsSchema = z.object({
  id: z.string().uuid(),
})

export const clientTimelineQuerySchema = paginatedQuerySchema

export type ClientTimelineQuery = z.infer<typeof clientTimelineQuerySchema>

export const clientTimelineItemSchema = z.object({
  id: z.string().uuid(),
  action: clientTimelineActionSchema,
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

export const clientTimelineResponseSchema = z.object({
  data: z.array(clientTimelineItemSchema),
  meta: lookupMetaSchema,
})

export type ClientTimelineResponse = z.infer<
  typeof clientTimelineResponseSchema
>

export const clientPoliciesParamsSchema = z.object({
  id: z.string().uuid(),
})

export const clientPoliciesQuerySchema = paginatedQuerySchema.extend({
  search: z.string().trim().max(200).optional(),
})

export type ClientPoliciesQuery = z.infer<typeof clientPoliciesQuerySchema>

export const clientPoliciesItemSchema = z.object({
  id: z.string().uuid(),
  policyNumber: z.string(),
  type: policyTypeSchema,
  status: policyStatusSchema,
  startDate: z.string(),
  endDate: z.string(),
  insurerName: z.string(),
})

export const clientPoliciesResponseSchema = z.object({
  data: z.array(clientPoliciesItemSchema),
  meta: lookupMetaSchema,
})

export type ClientPoliciesResponse = z.infer<
  typeof clientPoliciesResponseSchema
>
