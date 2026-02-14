import { queryOptions } from '@tanstack/react-query'
import type {
  InsurerTimelineQuery,
  ListInsurersQuery,
} from '@friendly-system/shared'
import { insurersApi } from './insurers.api'
import {
  INSURERS_LIST_QUERY_KEY,
  INSURERS_OPERATIONAL_QUERY_OPTIONS,
  INSURERS_QUERY_KEY,
} from './insurers.query-keys'

export function listInsurersQueryOptions(
  filters: Partial<ListInsurersQuery> = {},
) {
  return queryOptions({
    ...INSURERS_OPERATIONAL_QUERY_OPTIONS,
    queryKey: [...INSURERS_LIST_QUERY_KEY, filters] as const,
    queryFn: () => insurersApi.list(filters as Record<string, unknown>),
  })
}

export function insurerByIdQueryOptions(id: string) {
  return queryOptions({
    ...INSURERS_OPERATIONAL_QUERY_OPTIONS,
    queryKey: [...INSURERS_QUERY_KEY, id] as const,
    queryFn: () => insurersApi.getById(id),
    enabled: Boolean(id),
  })
}

export function insurerTimelineQueryOptions(
  id: string,
  query: Partial<InsurerTimelineQuery> = {},
) {
  return queryOptions({
    ...INSURERS_OPERATIONAL_QUERY_OPTIONS,
    queryKey: [...INSURERS_QUERY_KEY, id, 'timeline', query] as const,
    queryFn: () => insurersApi.timeline(id, query as Record<string, unknown>),
    enabled: Boolean(id),
  })
}
