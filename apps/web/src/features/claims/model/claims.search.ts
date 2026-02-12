import { listClaimsQuerySchema } from '@friendly-system/shared'

// Date filters are intentionally excluded from the list URL contract for now.
// `listClaimsQuerySchema` has a refinement, so Zod `.omit()` is not supported.
export const claimsListSearchSchema = listClaimsQuerySchema.transform(
  ({ dateFrom: _dateFrom, dateTo: _dateTo, ...rest }) => rest,
)

export const DEFAULT_CLAIMS_LIST_SEARCH = claimsListSearchSchema.parse({})

export type ClaimsListSearch = ReturnType<typeof claimsListSearchSchema.parse>

function parseSearchText(rawSearch: unknown): ClaimsListSearch['search'] {
  const result = listClaimsQuerySchema.safeParse({ search: rawSearch })
  if (!result.success) return undefined
  return result.data.search
}

function parseStatuses(rawStatus: unknown): ClaimsListSearch['status'] {
  const result = listClaimsQuerySchema.safeParse({ status: rawStatus })
  if (!result.success) return undefined
  return result.data.status
}

function parseSortBy(rawSortBy: unknown): ClaimsListSearch['sortBy'] {
  const result = listClaimsQuerySchema.safeParse({ sortBy: rawSortBy })
  if (!result.success) return DEFAULT_CLAIMS_LIST_SEARCH.sortBy
  return result.data.sortBy
}

function parseSortOrder(rawSortOrder: unknown): ClaimsListSearch['sortOrder'] {
  const result = listClaimsQuerySchema.safeParse({ sortOrder: rawSortOrder })
  if (!result.success) return DEFAULT_CLAIMS_LIST_SEARCH.sortOrder
  return result.data.sortOrder
}

function parsePage(rawPage: unknown): ClaimsListSearch['page'] {
  const result = listClaimsQuerySchema.safeParse({ page: rawPage })
  if (!result.success) return DEFAULT_CLAIMS_LIST_SEARCH.page
  return result.data.page
}

function parseLimit(rawLimit: unknown): ClaimsListSearch['limit'] {
  const result = listClaimsQuerySchema.safeParse({ limit: rawLimit })
  if (!result.success) return DEFAULT_CLAIMS_LIST_SEARCH.limit
  return result.data.limit
}

export function parseClaimsListSearch(
  rawSearch: Record<string, unknown>,
): ClaimsListSearch {
  const strict = claimsListSearchSchema.safeParse(rawSearch)
  if (strict.success) return strict.data

  const normalized: ClaimsListSearch = {
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
