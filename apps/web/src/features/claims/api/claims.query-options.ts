import { queryOptions } from '@tanstack/react-query'
import type { ListClaimsQuery } from '@friendly-system/shared'
import { claimsApi } from './claims.api'
import {
  CLAIMS_LOOKUP_QUERY_KEY,
  CLAIMS_LOOKUP_QUERY_OPTIONS,
  CLAIMS_OPERATIONAL_QUERY_OPTIONS,
  CLAIMS_QUERY_KEY,
  CLAIMS_LIST_QUERY_KEY,
} from './claims.query-keys'

export function listClaimsQueryOptions(filters: Partial<ListClaimsQuery> = {}) {
  return queryOptions({
    ...CLAIMS_OPERATIONAL_QUERY_OPTIONS,
    queryKey: [...CLAIMS_LIST_QUERY_KEY, filters] as const,
    queryFn: () => claimsApi.list(filters as Record<string, unknown>),
  })
}

export function claimByIdQueryOptions(id: string) {
  return queryOptions({
    ...CLAIMS_OPERATIONAL_QUERY_OPTIONS,
    queryKey: [...CLAIMS_QUERY_KEY, id] as const,
    queryFn: () => claimsApi.getById(id),
    enabled: Boolean(id),
  })
}

export function lookupClientsQueryOptions(query: Record<string, unknown> = {}) {
  return queryOptions({
    ...CLAIMS_LOOKUP_QUERY_OPTIONS,
    queryKey: [...CLAIMS_LOOKUP_QUERY_KEY, 'clients', query] as const,
    queryFn: () => claimsApi.lookupClients(query),
  })
}

export function lookupClientAffiliatesQueryOptions(
  clientId: string,
  query: Record<string, unknown> = {},
) {
  return queryOptions({
    ...CLAIMS_LOOKUP_QUERY_OPTIONS,
    queryKey: [
      ...CLAIMS_LOOKUP_QUERY_KEY,
      'affiliates',
      clientId,
      query,
    ] as const,
    queryFn: () => claimsApi.lookupClientAffiliates(clientId, query),
    enabled: Boolean(clientId),
  })
}

export function lookupAffiliatePatientsQueryOptions(affiliateId: string) {
  return queryOptions({
    ...CLAIMS_LOOKUP_QUERY_OPTIONS,
    queryKey: [...CLAIMS_LOOKUP_QUERY_KEY, 'patients', affiliateId] as const,
    queryFn: () => claimsApi.lookupAffiliatePatients(affiliateId),
    enabled: Boolean(affiliateId),
  })
}

export function lookupClientPoliciesQueryOptions(
  clientId: string,
  query: Record<string, unknown> = {},
) {
  return queryOptions({
    ...CLAIMS_LOOKUP_QUERY_OPTIONS,
    queryKey: [
      ...CLAIMS_LOOKUP_QUERY_KEY,
      'policies',
      clientId,
      query,
    ] as const,
    queryFn: () => claimsApi.lookupClientPolicies(clientId, query),
    enabled: Boolean(clientId),
  })
}

export function claimHistoryQueryOptions(
  id: string,
  query: Record<string, unknown> = {},
) {
  return queryOptions({
    ...CLAIMS_OPERATIONAL_QUERY_OPTIONS,
    queryKey: [...CLAIMS_QUERY_KEY, id, 'history', query] as const,
    queryFn: () => claimsApi.history(id, query),
    enabled: Boolean(id),
  })
}

export function claimTimelineQueryOptions(
  id: string,
  query: Record<string, unknown> = {},
) {
  return queryOptions({
    ...CLAIMS_OPERATIONAL_QUERY_OPTIONS,
    queryKey: [...CLAIMS_QUERY_KEY, id, 'timeline', query] as const,
    queryFn: () => claimsApi.timeline(id, query),
    enabled: Boolean(id),
  })
}

export function claimInvoicesQueryOptions(
  id: string,
  query: Record<string, unknown> = {},
) {
  return queryOptions({
    ...CLAIMS_OPERATIONAL_QUERY_OPTIONS,
    queryKey: [...CLAIMS_QUERY_KEY, id, 'invoices', query] as const,
    queryFn: () => claimsApi.listInvoices(id, query),
    enabled: Boolean(id),
  })
}
