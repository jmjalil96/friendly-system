import { listPoliciesQuerySchema } from '@friendly-system/shared'

export const policiesListSearchSchema = listPoliciesQuerySchema

export const DEFAULT_POLICIES_LIST_SEARCH = policiesListSearchSchema.parse({})

export type PoliciesListSearch = ReturnType<
  typeof policiesListSearchSchema.parse
>

function parseSearchText(rawSearch: unknown): PoliciesListSearch['search'] {
  const result = listPoliciesQuerySchema.safeParse({ search: rawSearch })
  if (!result.success) return undefined
  return result.data.search
}

function parseStatuses(rawStatus: unknown): PoliciesListSearch['status'] {
  const result = listPoliciesQuerySchema.safeParse({ status: rawStatus })
  if (!result.success) return undefined
  return result.data.status
}

function parseSortBy(rawSortBy: unknown): PoliciesListSearch['sortBy'] {
  const result = listPoliciesQuerySchema.safeParse({ sortBy: rawSortBy })
  if (!result.success) return DEFAULT_POLICIES_LIST_SEARCH.sortBy
  return result.data.sortBy
}

function parseSortOrder(
  rawSortOrder: unknown,
): PoliciesListSearch['sortOrder'] {
  const result = listPoliciesQuerySchema.safeParse({ sortOrder: rawSortOrder })
  if (!result.success) return DEFAULT_POLICIES_LIST_SEARCH.sortOrder
  return result.data.sortOrder
}

function parsePage(rawPage: unknown): PoliciesListSearch['page'] {
  const result = listPoliciesQuerySchema.safeParse({ page: rawPage })
  if (!result.success) return DEFAULT_POLICIES_LIST_SEARCH.page
  return result.data.page
}

function parseLimit(rawLimit: unknown): PoliciesListSearch['limit'] {
  const result = listPoliciesQuerySchema.safeParse({ limit: rawLimit })
  if (!result.success) return DEFAULT_POLICIES_LIST_SEARCH.limit
  return result.data.limit
}

export function parsePoliciesListSearch(
  rawSearch: Record<string, unknown>,
): PoliciesListSearch {
  const strict = policiesListSearchSchema.safeParse(rawSearch)
  if (strict.success) return strict.data

  const normalized: PoliciesListSearch = {
    sortBy: parseSortBy(rawSearch.sortBy),
    sortOrder: parseSortOrder(rawSearch.sortOrder),
    page: parsePage(rawSearch.page),
    limit: parseLimit(rawSearch.limit),
  }

  const searchText = parseSearchText(rawSearch.search)
  if (searchText !== undefined) normalized.search = searchText

  const statuses = parseStatuses(rawSearch.status)
  if (statuses !== undefined) normalized.status = statuses

  return normalized
}
