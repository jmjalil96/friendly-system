import { queryOptions } from '@tanstack/react-query'
import type {
  ClientPoliciesQuery,
  ClientTimelineQuery,
  ListClientsQuery,
} from '@friendly-system/shared'
import { clientsApi } from './clients.api'
import {
  CLIENTS_LIST_QUERY_KEY,
  CLIENTS_OPERATIONAL_QUERY_OPTIONS,
  CLIENTS_QUERY_KEY,
} from './clients.query-keys'

export function listClientsQueryOptions(
  filters: Partial<ListClientsQuery> = {},
) {
  return queryOptions({
    ...CLIENTS_OPERATIONAL_QUERY_OPTIONS,
    queryKey: [...CLIENTS_LIST_QUERY_KEY, filters] as const,
    queryFn: () => clientsApi.list(filters as Record<string, unknown>),
  })
}

export function clientByIdQueryOptions(id: string) {
  return queryOptions({
    ...CLIENTS_OPERATIONAL_QUERY_OPTIONS,
    queryKey: [...CLIENTS_QUERY_KEY, id] as const,
    queryFn: () => clientsApi.getById(id),
    enabled: Boolean(id),
  })
}

export function clientTimelineQueryOptions(
  id: string,
  query: Partial<ClientTimelineQuery> = {},
) {
  return queryOptions({
    ...CLIENTS_OPERATIONAL_QUERY_OPTIONS,
    queryKey: [...CLIENTS_QUERY_KEY, id, 'timeline', query] as const,
    queryFn: () => clientsApi.timeline(id, query as Record<string, unknown>),
    enabled: Boolean(id),
  })
}

export function clientPoliciesQueryOptions(
  id: string,
  query: Partial<ClientPoliciesQuery> = {},
) {
  return queryOptions({
    ...CLIENTS_OPERATIONAL_QUERY_OPTIONS,
    queryKey: [...CLIENTS_QUERY_KEY, id, 'policies', query] as const,
    queryFn: () => clientsApi.policies(id, query as Record<string, unknown>),
    enabled: Boolean(id),
  })
}
