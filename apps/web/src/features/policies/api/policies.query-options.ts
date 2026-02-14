import { queryOptions } from '@tanstack/react-query'
import type { ListPoliciesQuery } from '@friendly-system/shared'
import { policiesApi } from './policies.api'
import {
  POLICIES_LIST_QUERY_KEY,
  POLICIES_LOOKUP_QUERY_KEY,
  POLICIES_LOOKUP_QUERY_OPTIONS,
  POLICIES_OPERATIONAL_QUERY_OPTIONS,
  POLICIES_QUERY_KEY,
} from './policies.query-keys'

export function listPoliciesQueryOptions(
  filters: Partial<ListPoliciesQuery> = {},
) {
  return queryOptions({
    ...POLICIES_OPERATIONAL_QUERY_OPTIONS,
    queryKey: [...POLICIES_LIST_QUERY_KEY, filters] as const,
    queryFn: () => policiesApi.list(filters as Record<string, unknown>),
  })
}

export function policyByIdQueryOptions(id: string) {
  return queryOptions({
    ...POLICIES_OPERATIONAL_QUERY_OPTIONS,
    queryKey: [...POLICIES_QUERY_KEY, id] as const,
    queryFn: () => policiesApi.getById(id),
    enabled: Boolean(id),
  })
}

export function lookupPolicyClientsQueryOptions(
  query: Record<string, unknown> = {},
) {
  return queryOptions({
    ...POLICIES_LOOKUP_QUERY_OPTIONS,
    queryKey: [...POLICIES_LOOKUP_QUERY_KEY, 'clients', query] as const,
    queryFn: () => policiesApi.lookupClients(query),
  })
}

export function lookupPolicyInsurersQueryOptions(
  query: Record<string, unknown> = {},
) {
  return queryOptions({
    ...POLICIES_LOOKUP_QUERY_OPTIONS,
    queryKey: [...POLICIES_LOOKUP_QUERY_KEY, 'insurers', query] as const,
    queryFn: () => policiesApi.lookupInsurers(query),
  })
}

export function policyHistoryQueryOptions(
  id: string,
  query: Record<string, unknown> = {},
) {
  return queryOptions({
    ...POLICIES_OPERATIONAL_QUERY_OPTIONS,
    queryKey: [...POLICIES_QUERY_KEY, id, 'history', query] as const,
    queryFn: () => policiesApi.history(id, query),
    enabled: Boolean(id),
  })
}

export function policyTimelineQueryOptions(
  id: string,
  query: Record<string, unknown> = {},
) {
  return queryOptions({
    ...POLICIES_OPERATIONAL_QUERY_OPTIONS,
    queryKey: [...POLICIES_QUERY_KEY, id, 'timeline', query] as const,
    queryFn: () => policiesApi.timeline(id, query),
    enabled: Boolean(id),
  })
}
