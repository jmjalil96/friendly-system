import { listInsurersQuerySchema } from '@friendly-system/shared'

export const insurersListSearchSchema = listInsurersQuerySchema

export const DEFAULT_INSURERS_LIST_SEARCH = insurersListSearchSchema.parse({})

export type InsurersListSearch = ReturnType<
  typeof insurersListSearchSchema.parse
>

function parseSearchText(rawSearch: unknown): InsurersListSearch['search'] {
  const result = listInsurersQuerySchema.safeParse({ search: rawSearch })
  if (!result.success) return undefined
  return result.data.search
}

function parseActiveFilter(
  rawIsActive: unknown,
): InsurersListSearch['isActive'] {
  const result = listInsurersQuerySchema.safeParse({ isActive: rawIsActive })
  if (!result.success) return undefined
  return result.data.isActive
}

function parseSortBy(rawSortBy: unknown): InsurersListSearch['sortBy'] {
  const result = listInsurersQuerySchema.safeParse({ sortBy: rawSortBy })
  if (!result.success) return DEFAULT_INSURERS_LIST_SEARCH.sortBy
  return result.data.sortBy
}

function parseSortOrder(
  rawSortOrder: unknown,
): InsurersListSearch['sortOrder'] {
  const result = listInsurersQuerySchema.safeParse({ sortOrder: rawSortOrder })
  if (!result.success) return DEFAULT_INSURERS_LIST_SEARCH.sortOrder
  return result.data.sortOrder
}

function parsePage(rawPage: unknown): InsurersListSearch['page'] {
  const result = listInsurersQuerySchema.safeParse({ page: rawPage })
  if (!result.success) return DEFAULT_INSURERS_LIST_SEARCH.page
  return result.data.page
}

function parseLimit(rawLimit: unknown): InsurersListSearch['limit'] {
  const result = listInsurersQuerySchema.safeParse({ limit: rawLimit })
  if (!result.success) return DEFAULT_INSURERS_LIST_SEARCH.limit
  return result.data.limit
}

export function parseInsurersListSearch(
  rawSearch: Record<string, unknown>,
): InsurersListSearch {
  const strict = insurersListSearchSchema.safeParse(rawSearch)
  if (strict.success) return strict.data

  const normalized: InsurersListSearch = {
    sortBy: parseSortBy(rawSearch.sortBy),
    sortOrder: parseSortOrder(rawSearch.sortOrder),
    page: parsePage(rawSearch.page),
    limit: parseLimit(rawSearch.limit),
  }

  const searchText = parseSearchText(rawSearch.search)
  if (searchText !== undefined) normalized.search = searchText

  const isActive = parseActiveFilter(rawSearch.isActive)
  if (isActive !== undefined) normalized.isActive = isActive

  return normalized
}
