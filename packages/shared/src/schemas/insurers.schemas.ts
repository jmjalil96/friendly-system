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

export const insurerTypeSchema = z.enum([
  'MEDICINA_PREPAGADA',
  'COMPANIA_DE_SEGUROS',
])

export type InsurerType = z.infer<typeof insurerTypeSchema>

const insurerTimelineActionSchema = z.enum([
  'insurer.created',
  'insurer.updated',
  'insurer.deactivated',
])

const codeSchema = z
  .string()
  .trim()
  .min(1)
  .max(50)
  .refine(noNullBytes, NULL_BYTE_MSG)

const emailSchema = z
  .string()
  .trim()
  .min(1)
  .max(255)
  .email('Invalid email')
  .refine(noNullBytes, NULL_BYTE_MSG)

const phoneSchema = z
  .string()
  .trim()
  .min(1)
  .max(50)
  .refine(noNullBytes, NULL_BYTE_MSG)

const websiteSchema = z
  .string()
  .trim()
  .min(1)
  .max(500)
  .url('Invalid URL')
  .refine(noNullBytes, NULL_BYTE_MSG)

export const createInsurerSchema = z.object({
  name: z.string().trim().min(1).max(255).refine(noNullBytes, NULL_BYTE_MSG),
  type: insurerTypeSchema,
  code: codeSchema.optional(),
  email: emailSchema.optional(),
  phone: phoneSchema.optional(),
  website: websiteSchema.optional(),
  isActive: z.boolean().optional(),
})

export type CreateInsurerInput = z.infer<typeof createInsurerSchema>

export const createInsurerResponseSchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  name: z.string(),
  type: insurerTypeSchema,
  code: z.string().nullable(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  website: z.string().nullable(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export type CreateInsurerResponse = z.infer<typeof createInsurerResponseSchema>

export const getInsurerByIdParamsSchema = z.object({
  id: z.string().uuid(),
})

export const getInsurerByIdResponseSchema = createInsurerResponseSchema

export type GetInsurerByIdResponse = z.infer<
  typeof getInsurerByIdResponseSchema
>

export const listInsurersQuerySchema = z.object({
  search: z.string().trim().max(200).optional(),
  isActive: booleanQuerySchema.optional(),
  type: insurerTypeSchema.optional(),
  sortBy: z
    .enum(['createdAt', 'name', 'type', 'updatedAt'])
    .default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  page: z.coerce.number().int().min(1).max(1000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export type ListInsurersQuery = z.infer<typeof listInsurersQuerySchema>

export const listInsurersItemSchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  name: z.string(),
  type: insurerTypeSchema,
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export type ListInsurersItem = z.infer<typeof listInsurersItemSchema>

export const listInsurersResponseSchema = z.object({
  data: z.array(listInsurersItemSchema),
  meta: lookupMetaSchema,
})

export type ListInsurersResponse = z.infer<typeof listInsurersResponseSchema>

export const updateInsurerParamsSchema = z.object({
  id: z.string().uuid(),
})

export const updateInsurerSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1)
      .max(255)
      .refine(noNullBytes, NULL_BYTE_MSG)
      .optional(),
    type: insurerTypeSchema.optional(),
    code: codeSchema.nullable().optional(),
    email: emailSchema.nullable().optional(),
    phone: phoneSchema.nullable().optional(),
    website: websiteSchema.nullable().optional(),
    isActive: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  })

export type UpdateInsurerInput = z.infer<typeof updateInsurerSchema>

export const deleteInsurerParamsSchema = z.object({
  id: z.string().uuid(),
})

export const deleteInsurerResponseSchema = z.object({
  message: z.literal('Insurer deactivated'),
})

export type DeleteInsurerResponse = z.infer<typeof deleteInsurerResponseSchema>

export const insurerTimelineParamsSchema = z.object({
  id: z.string().uuid(),
})

export const insurerTimelineQuerySchema = paginatedQuerySchema

export type InsurerTimelineQuery = z.infer<typeof insurerTimelineQuerySchema>

export const insurerTimelineItemSchema = z.object({
  id: z.string().uuid(),
  action: insurerTimelineActionSchema,
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

export const insurerTimelineResponseSchema = z.object({
  data: z.array(insurerTimelineItemSchema),
  meta: lookupMetaSchema,
})

export type InsurerTimelineResponse = z.infer<
  typeof insurerTimelineResponseSchema
>
