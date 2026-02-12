import {
  parseClaimsListSearch,
  type ClaimsListSearch,
} from '@/features/claims/model/claims.search'

export function parseClaimsListRouteSearch(search: Record<string, unknown>) {
  return parseClaimsListSearch(search)
}

export function stripStatus(search: ClaimsListSearch): ClaimsListSearch {
  const nextSearch = { ...search }
  delete nextSearch.status
  return nextSearch
}

export function parsePendingClaimsListRouteSearch(
  search: Record<string, unknown>,
) {
  return stripStatus(parseClaimsListSearch(search))
}
