import { getPolicyByIdParamsSchema } from '@friendly-system/shared'

export function parsePolicyDetailParams(params: { id: string }) {
  return getPolicyByIdParamsSchema.parse(params)
}
