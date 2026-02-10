import { z } from 'zod'

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
