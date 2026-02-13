import { getClientByIdParamsSchema } from '@friendly-system/shared'

export function parseClientDetailParams(params: { id: string }) {
  return getClientByIdParamsSchema.parse(params)
}
