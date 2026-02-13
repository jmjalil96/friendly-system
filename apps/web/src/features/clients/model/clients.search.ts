import { listClientsQuerySchema } from '@friendly-system/shared'

export const clientsListSearchSchema = listClientsQuerySchema

export const DEFAULT_CLIENTS_LIST_SEARCH = clientsListSearchSchema.parse({})

export type ClientsListSearch = ReturnType<typeof clientsListSearchSchema.parse>

function parseSearchText(rawSearch: unknown): ClientsListSearch['search'] {
  const result = listClientsQuerySchema.safeParse({ search: rawSearch })
  if (!result.success) return undefined
  return result.data.search
}

function parseActiveFilter(
  rawIsActive: unknown,
): ClientsListSearch['isActive'] {
  const result = listClientsQuerySchema.safeParse({ isActive: rawIsActive })
  if (!result.success) return undefined
  return result.data.isActive
}

function parseSortBy(rawSortBy: unknown): ClientsListSearch['sortBy'] {
  const result = listClientsQuerySchema.safeParse({ sortBy: rawSortBy })
  if (!result.success) return DEFAULT_CLIENTS_LIST_SEARCH.sortBy
  return result.data.sortBy
}

function parseSortOrder(rawSortOrder: unknown): ClientsListSearch['sortOrder'] {
  const result = listClientsQuerySchema.safeParse({ sortOrder: rawSortOrder })
  if (!result.success) return DEFAULT_CLIENTS_LIST_SEARCH.sortOrder
  return result.data.sortOrder
}

function parsePage(rawPage: unknown): ClientsListSearch['page'] {
  const result = listClientsQuerySchema.safeParse({ page: rawPage })
  if (!result.success) return DEFAULT_CLIENTS_LIST_SEARCH.page
  return result.data.page
}

function parseLimit(rawLimit: unknown): ClientsListSearch['limit'] {
  const result = listClientsQuerySchema.safeParse({ limit: rawLimit })
  if (!result.success) return DEFAULT_CLIENTS_LIST_SEARCH.limit
  return result.data.limit
}

export function parseClientsListSearch(
  rawSearch: Record<string, unknown>,
): ClientsListSearch {
  const strict = clientsListSearchSchema.safeParse(rawSearch)
  if (strict.success) return strict.data

  const normalized: ClientsListSearch = {
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
