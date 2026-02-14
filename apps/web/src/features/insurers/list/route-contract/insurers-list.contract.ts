import { parseInsurersListSearch } from '@/features/insurers/model/insurers.search'

export function parseInsurersListRouteSearch(search: Record<string, unknown>) {
  return parseInsurersListSearch(search)
}
