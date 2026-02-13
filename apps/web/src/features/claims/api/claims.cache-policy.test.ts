import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  claimByIdQueryOptions,
  claimHistoryQueryOptions,
  claimInvoicesQueryOptions,
  claimTimelineQueryOptions,
  listClaimsQueryOptions,
  lookupAffiliatePatientsQueryOptions,
  lookupClientAffiliatesQueryOptions,
  lookupClientPoliciesQueryOptions,
  lookupClientsQueryOptions,
} from '@/features/claims/api/claims.hooks'
import {
  CLAIMS_LIST_QUERY_KEY,
  CLAIMS_LOOKUP_QUERY_KEY,
  CLAIMS_OPERATIONAL_QUERY_OPTIONS,
  CLAIMS_QUERY_KEY,
  CLAIMS_LOOKUP_QUERY_OPTIONS,
} from '@/features/claims/api/claims.query-keys'

const claimsApiMocks = vi.hoisted(() => ({
  list: vi.fn(),
  getById: vi.fn(),
  lookupClients: vi.fn(),
  lookupClientAffiliates: vi.fn(),
  lookupAffiliatePatients: vi.fn(),
  lookupClientPolicies: vi.fn(),
  history: vi.fn(),
  timeline: vi.fn(),
  listInvoices: vi.fn(),
}))

vi.mock('@/features/claims/api/claims.api', () => ({
  claimsApi: claimsApiMocks,
}))

describe('claims query cache policy', () => {
  beforeEach(() => {
    claimsApiMocks.list.mockReset()
    claimsApiMocks.getById.mockReset()
    claimsApiMocks.lookupClients.mockReset()
    claimsApiMocks.lookupClientAffiliates.mockReset()
    claimsApiMocks.lookupAffiliatePatients.mockReset()
    claimsApiMocks.lookupClientPolicies.mockReset()
    claimsApiMocks.history.mockReset()
    claimsApiMocks.timeline.mockReset()
    claimsApiMocks.listInvoices.mockReset()
  })

  it('applies operational cache policy to list claims', async () => {
    const filters = { search: 'dolor', page: 2, limit: 20 } as const
    const options = listClaimsQueryOptions(filters)

    expect(options.queryKey).toEqual([...CLAIMS_LIST_QUERY_KEY, filters])
    expect(options.staleTime).toBe(CLAIMS_OPERATIONAL_QUERY_OPTIONS.staleTime)
    expect(options.refetchOnWindowFocus).toBe(
      CLAIMS_OPERATIONAL_QUERY_OPTIONS.refetchOnWindowFocus,
    )
    expect(options.refetchOnReconnect).toBe(
      CLAIMS_OPERATIONAL_QUERY_OPTIONS.refetchOnReconnect,
    )
    expect(options.refetchInterval).toBeUndefined()

    claimsApiMocks.list.mockResolvedValueOnce({ data: [], meta: {} })
    await (options.queryFn as () => Promise<unknown>)()
    expect(claimsApiMocks.list).toHaveBeenCalledWith(filters)
  })

  it('applies operational policy to detail/history/timeline/invoices and keeps enabled guards', async () => {
    const claimId = '550e8400-e29b-41d4-a716-446655440000'

    const byId = claimByIdQueryOptions(claimId)
    expect(byId.queryKey).toEqual([...CLAIMS_QUERY_KEY, claimId])
    expect(byId.enabled).toBe(true)
    expect(byId.staleTime).toBe(CLAIMS_OPERATIONAL_QUERY_OPTIONS.staleTime)
    expect(byId.refetchOnWindowFocus).toBe(true)
    expect(byId.refetchOnReconnect).toBe(true)
    expect(byId.refetchInterval).toBeUndefined()

    const byIdDisabled = claimByIdQueryOptions('')
    expect(byIdDisabled.enabled).toBe(false)

    const history = claimHistoryQueryOptions(claimId, { page: 1 })
    expect(history.queryKey).toEqual([
      ...CLAIMS_QUERY_KEY,
      claimId,
      'history',
      { page: 1 },
    ])
    expect(history.staleTime).toBe(CLAIMS_OPERATIONAL_QUERY_OPTIONS.staleTime)
    expect(history.refetchOnWindowFocus).toBe(true)
    expect(history.refetchOnReconnect).toBe(true)

    const timeline = claimTimelineQueryOptions(claimId, { page: 1 })
    expect(timeline.queryKey).toEqual([
      ...CLAIMS_QUERY_KEY,
      claimId,
      'timeline',
      { page: 1 },
    ])
    expect(timeline.staleTime).toBe(CLAIMS_OPERATIONAL_QUERY_OPTIONS.staleTime)
    expect(timeline.refetchOnWindowFocus).toBe(true)
    expect(timeline.refetchOnReconnect).toBe(true)

    const invoices = claimInvoicesQueryOptions(claimId, { page: 1 })
    expect(invoices.queryKey).toEqual([
      ...CLAIMS_QUERY_KEY,
      claimId,
      'invoices',
      { page: 1 },
    ])
    expect(invoices.staleTime).toBe(CLAIMS_OPERATIONAL_QUERY_OPTIONS.staleTime)
    expect(invoices.refetchOnWindowFocus).toBe(true)
    expect(invoices.refetchOnReconnect).toBe(true)

    claimsApiMocks.getById.mockResolvedValueOnce({})
    await (byId.queryFn as () => Promise<unknown>)()
    expect(claimsApiMocks.getById).toHaveBeenCalledWith(claimId)

    claimsApiMocks.history.mockResolvedValueOnce({})
    await (history.queryFn as () => Promise<unknown>)()
    expect(claimsApiMocks.history).toHaveBeenCalledWith(claimId, { page: 1 })

    claimsApiMocks.timeline.mockResolvedValueOnce({})
    await (timeline.queryFn as () => Promise<unknown>)()
    expect(claimsApiMocks.timeline).toHaveBeenCalledWith(claimId, { page: 1 })

    claimsApiMocks.listInvoices.mockResolvedValueOnce({})
    await (invoices.queryFn as () => Promise<unknown>)()
    expect(claimsApiMocks.listInvoices).toHaveBeenCalledWith(claimId, {
      page: 1,
    })
  })

  it('applies lookup cache policy across lookup queries and preserves enabled behavior', async () => {
    const clients = lookupClientsQueryOptions({ search: 'seguros' })
    expect(clients.queryKey).toEqual([
      ...CLAIMS_LOOKUP_QUERY_KEY,
      'clients',
      { search: 'seguros' },
    ])
    expect(clients.staleTime).toBe(CLAIMS_LOOKUP_QUERY_OPTIONS.staleTime)
    expect(clients.refetchOnWindowFocus).toBe(false)
    expect(clients.refetchOnReconnect).toBe(false)
    expect(clients.refetchInterval).toBeUndefined()

    const affiliates = lookupClientAffiliatesQueryOptions('client-1', {
      search: 'gonzalez',
    })
    expect(affiliates.queryKey).toEqual([
      ...CLAIMS_LOOKUP_QUERY_KEY,
      'affiliates',
      'client-1',
      { search: 'gonzalez' },
    ])
    expect(affiliates.enabled).toBe(true)
    expect(affiliates.staleTime).toBe(CLAIMS_LOOKUP_QUERY_OPTIONS.staleTime)
    expect(affiliates.refetchOnWindowFocus).toBe(false)
    expect(affiliates.refetchOnReconnect).toBe(false)

    const affiliatesDisabled = lookupClientAffiliatesQueryOptions('', {})
    expect(affiliatesDisabled.enabled).toBe(false)

    const patients = lookupAffiliatePatientsQueryOptions('affiliate-1')
    expect(patients.queryKey).toEqual([
      ...CLAIMS_LOOKUP_QUERY_KEY,
      'patients',
      'affiliate-1',
    ])
    expect(patients.enabled).toBe(true)
    expect(patients.staleTime).toBe(CLAIMS_LOOKUP_QUERY_OPTIONS.staleTime)
    expect(patients.refetchOnWindowFocus).toBe(false)
    expect(patients.refetchOnReconnect).toBe(false)

    const patientsDisabled = lookupAffiliatePatientsQueryOptions('')
    expect(patientsDisabled.enabled).toBe(false)

    const policies = lookupClientPoliciesQueryOptions('client-1', {
      search: 'plan',
    })
    expect(policies.queryKey).toEqual([
      ...CLAIMS_LOOKUP_QUERY_KEY,
      'policies',
      'client-1',
      { search: 'plan' },
    ])
    expect(policies.enabled).toBe(true)
    expect(policies.staleTime).toBe(CLAIMS_LOOKUP_QUERY_OPTIONS.staleTime)
    expect(policies.refetchOnWindowFocus).toBe(false)
    expect(policies.refetchOnReconnect).toBe(false)

    const policiesDisabled = lookupClientPoliciesQueryOptions('', {})
    expect(policiesDisabled.enabled).toBe(false)

    claimsApiMocks.lookupClients.mockResolvedValueOnce({})
    await (clients.queryFn as () => Promise<unknown>)()
    expect(claimsApiMocks.lookupClients).toHaveBeenCalledWith({
      search: 'seguros',
    })

    claimsApiMocks.lookupClientAffiliates.mockResolvedValueOnce({})
    await (affiliates.queryFn as () => Promise<unknown>)()
    expect(claimsApiMocks.lookupClientAffiliates).toHaveBeenCalledWith(
      'client-1',
      { search: 'gonzalez' },
    )

    claimsApiMocks.lookupAffiliatePatients.mockResolvedValueOnce({})
    await (patients.queryFn as () => Promise<unknown>)()
    expect(claimsApiMocks.lookupAffiliatePatients).toHaveBeenCalledWith(
      'affiliate-1',
    )

    claimsApiMocks.lookupClientPolicies.mockResolvedValueOnce({})
    await (policies.queryFn as () => Promise<unknown>)()
    expect(claimsApiMocks.lookupClientPolicies).toHaveBeenCalledWith(
      'client-1',
      { search: 'plan' },
    )
  })
})
