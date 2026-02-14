import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  listPoliciesQueryOptions,
  lookupPolicyClientsQueryOptions,
  lookupPolicyInsurersQueryOptions,
  policyByIdQueryOptions,
  policyHistoryQueryOptions,
  policyTimelineQueryOptions,
} from '@/features/policies/api/policies.hooks'
import {
  POLICIES_LIST_QUERY_KEY,
  POLICIES_LOOKUP_QUERY_KEY,
  POLICIES_LOOKUP_QUERY_OPTIONS,
  POLICIES_OPERATIONAL_QUERY_OPTIONS,
  POLICIES_QUERY_KEY,
} from '@/features/policies/api/policies.query-keys'

const policiesApiMocks = vi.hoisted(() => ({
  list: vi.fn(),
  getById: vi.fn(),
  lookupClients: vi.fn(),
  lookupInsurers: vi.fn(),
  history: vi.fn(),
  timeline: vi.fn(),
}))

vi.mock('@/features/policies/api/policies.api', () => ({
  policiesApi: policiesApiMocks,
}))

describe('policies query cache policy', () => {
  beforeEach(() => {
    policiesApiMocks.list.mockReset()
    policiesApiMocks.getById.mockReset()
    policiesApiMocks.lookupClients.mockReset()
    policiesApiMocks.lookupInsurers.mockReset()
    policiesApiMocks.history.mockReset()
    policiesApiMocks.timeline.mockReset()
  })

  it('applies operational cache policy to list policies', async () => {
    const filters = { search: 'POL-2026', page: 2, limit: 20 } as const
    const options = listPoliciesQueryOptions(filters)

    expect(options.queryKey).toEqual([...POLICIES_LIST_QUERY_KEY, filters])
    expect(options.staleTime).toBe(POLICIES_OPERATIONAL_QUERY_OPTIONS.staleTime)
    expect(options.refetchOnWindowFocus).toBe(
      POLICIES_OPERATIONAL_QUERY_OPTIONS.refetchOnWindowFocus,
    )
    expect(options.refetchOnReconnect).toBe(
      POLICIES_OPERATIONAL_QUERY_OPTIONS.refetchOnReconnect,
    )
    expect(options.refetchInterval).toBeUndefined()

    policiesApiMocks.list.mockResolvedValueOnce({ data: [], meta: {} })
    await (options.queryFn as () => Promise<unknown>)()
    expect(policiesApiMocks.list).toHaveBeenCalledWith(filters)
  })

  it('applies operational policy to detail/history/timeline and keeps enabled guards', async () => {
    const policyId = '550e8400-e29b-41d4-a716-446655440000'

    const byId = policyByIdQueryOptions(policyId)
    expect(byId.queryKey).toEqual([...POLICIES_QUERY_KEY, policyId])
    expect(byId.enabled).toBe(true)
    expect(byId.staleTime).toBe(POLICIES_OPERATIONAL_QUERY_OPTIONS.staleTime)
    expect(byId.refetchOnWindowFocus).toBe(true)
    expect(byId.refetchOnReconnect).toBe(true)
    expect(byId.refetchInterval).toBeUndefined()

    const byIdDisabled = policyByIdQueryOptions('')
    expect(byIdDisabled.enabled).toBe(false)

    const history = policyHistoryQueryOptions(policyId, { page: 1 })
    expect(history.queryKey).toEqual([
      ...POLICIES_QUERY_KEY,
      policyId,
      'history',
      { page: 1 },
    ])
    expect(history.staleTime).toBe(POLICIES_OPERATIONAL_QUERY_OPTIONS.staleTime)
    expect(history.refetchOnWindowFocus).toBe(true)
    expect(history.refetchOnReconnect).toBe(true)

    const timeline = policyTimelineQueryOptions(policyId, { page: 1 })
    expect(timeline.queryKey).toEqual([
      ...POLICIES_QUERY_KEY,
      policyId,
      'timeline',
      { page: 1 },
    ])
    expect(timeline.staleTime).toBe(
      POLICIES_OPERATIONAL_QUERY_OPTIONS.staleTime,
    )
    expect(timeline.refetchOnWindowFocus).toBe(true)
    expect(timeline.refetchOnReconnect).toBe(true)

    policiesApiMocks.getById.mockResolvedValueOnce({})
    await (byId.queryFn as () => Promise<unknown>)()
    expect(policiesApiMocks.getById).toHaveBeenCalledWith(policyId)

    policiesApiMocks.history.mockResolvedValueOnce({})
    await (history.queryFn as () => Promise<unknown>)()
    expect(policiesApiMocks.history).toHaveBeenCalledWith(policyId, { page: 1 })

    policiesApiMocks.timeline.mockResolvedValueOnce({})
    await (timeline.queryFn as () => Promise<unknown>)()
    expect(policiesApiMocks.timeline).toHaveBeenCalledWith(policyId, {
      page: 1,
    })
  })

  it('applies lookup cache policy to client and insurer lookups', async () => {
    const clients = lookupPolicyClientsQueryOptions({ search: 'empresa' })
    expect(clients.queryKey).toEqual([
      ...POLICIES_LOOKUP_QUERY_KEY,
      'clients',
      { search: 'empresa' },
    ])
    expect(clients.staleTime).toBe(POLICIES_LOOKUP_QUERY_OPTIONS.staleTime)
    expect(clients.refetchOnWindowFocus).toBe(false)
    expect(clients.refetchOnReconnect).toBe(false)
    expect(clients.refetchInterval).toBeUndefined()

    const insurers = lookupPolicyInsurersQueryOptions({ search: 'salud' })
    expect(insurers.queryKey).toEqual([
      ...POLICIES_LOOKUP_QUERY_KEY,
      'insurers',
      { search: 'salud' },
    ])
    expect(insurers.staleTime).toBe(POLICIES_LOOKUP_QUERY_OPTIONS.staleTime)
    expect(insurers.refetchOnWindowFocus).toBe(false)
    expect(insurers.refetchOnReconnect).toBe(false)
    expect(insurers.refetchInterval).toBeUndefined()

    policiesApiMocks.lookupClients.mockResolvedValueOnce({})
    await (clients.queryFn as () => Promise<unknown>)()
    expect(policiesApiMocks.lookupClients).toHaveBeenCalledWith({
      search: 'empresa',
    })

    policiesApiMocks.lookupInsurers.mockResolvedValueOnce({})
    await (insurers.queryFn as () => Promise<unknown>)()
    expect(policiesApiMocks.lookupInsurers).toHaveBeenCalledWith({
      search: 'salud',
    })
  })
})
