import { parsePoliciesListSearch } from '@/features/policies/model/policies.search'

export function parsePoliciesListRouteSearch(search: Record<string, unknown>) {
  return parsePoliciesListSearch(search)
}
