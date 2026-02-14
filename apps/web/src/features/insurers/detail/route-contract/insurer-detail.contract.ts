import { getInsurerByIdParamsSchema } from '@friendly-system/shared'

export function parseInsurerDetailParams(params: { id: string }) {
  return getInsurerByIdParamsSchema.parse(params)
}
