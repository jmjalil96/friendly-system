import { getClaimByIdParamsSchema } from '@friendly-system/shared'

export function parseClaimDetailParams(params: { id: string }) {
  return getClaimByIdParamsSchema.parse(params)
}
