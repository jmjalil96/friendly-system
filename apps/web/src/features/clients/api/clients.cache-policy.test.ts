import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  clientByIdQueryOptions,
  clientPoliciesQueryOptions,
  clientTimelineQueryOptions,
  listClientsQueryOptions,
} from '@/features/clients/api/clients.hooks'
import {
  CLIENTS_LIST_QUERY_KEY,
  CLIENTS_OPERATIONAL_QUERY_OPTIONS,
  CLIENTS_QUERY_KEY,
} from '@/features/clients/api/clients.query-keys'

const clientsApiMocks = vi.hoisted(() => ({
  list: vi.fn(),
  getById: vi.fn(),
  timeline: vi.fn(),
  policies: vi.fn(),
}))

vi.mock('@/features/clients/api/clients.api', () => ({
  clientsApi: clientsApiMocks,
}))

describe('clients query cache policy', () => {
  beforeEach(() => {
    clientsApiMocks.list.mockReset()
    clientsApiMocks.getById.mockReset()
    clientsApiMocks.timeline.mockReset()
    clientsApiMocks.policies.mockReset()
  })

  it('applies operational cache policy to list clients', async () => {
    const filters = { search: 'salud', page: 2, limit: 20 } as const
    const options = listClientsQueryOptions(filters)

    expect(options.queryKey).toEqual([...CLIENTS_LIST_QUERY_KEY, filters])
    expect(options.staleTime).toBe(CLIENTS_OPERATIONAL_QUERY_OPTIONS.staleTime)
    expect(options.refetchOnWindowFocus).toBe(
      CLIENTS_OPERATIONAL_QUERY_OPTIONS.refetchOnWindowFocus,
    )
    expect(options.refetchOnReconnect).toBe(
      CLIENTS_OPERATIONAL_QUERY_OPTIONS.refetchOnReconnect,
    )
    expect(options.refetchInterval).toBeUndefined()

    clientsApiMocks.list.mockResolvedValueOnce({ data: [], meta: {} })
    await (options.queryFn as () => Promise<unknown>)()
    expect(clientsApiMocks.list).toHaveBeenCalledWith(filters)
  })

  it('applies operational policy to detail/timeline/policies and keeps enabled guards', async () => {
    const clientId = '550e8400-e29b-41d4-a716-446655440000'

    const byId = clientByIdQueryOptions(clientId)
    expect(byId.queryKey).toEqual([...CLIENTS_QUERY_KEY, clientId])
    expect(byId.enabled).toBe(true)
    expect(byId.staleTime).toBe(CLIENTS_OPERATIONAL_QUERY_OPTIONS.staleTime)
    expect(byId.refetchOnWindowFocus).toBe(true)
    expect(byId.refetchOnReconnect).toBe(true)
    expect(byId.refetchInterval).toBeUndefined()

    const byIdDisabled = clientByIdQueryOptions('')
    expect(byIdDisabled.enabled).toBe(false)

    const timeline = clientTimelineQueryOptions(clientId, { page: 1 })
    expect(timeline.queryKey).toEqual([
      ...CLIENTS_QUERY_KEY,
      clientId,
      'timeline',
      { page: 1 },
    ])
    expect(timeline.staleTime).toBe(CLIENTS_OPERATIONAL_QUERY_OPTIONS.staleTime)
    expect(timeline.refetchOnWindowFocus).toBe(true)
    expect(timeline.refetchOnReconnect).toBe(true)

    const policies = clientPoliciesQueryOptions(clientId, { page: 1 })
    expect(policies.queryKey).toEqual([
      ...CLIENTS_QUERY_KEY,
      clientId,
      'policies',
      { page: 1 },
    ])
    expect(policies.staleTime).toBe(CLIENTS_OPERATIONAL_QUERY_OPTIONS.staleTime)
    expect(policies.refetchOnWindowFocus).toBe(true)
    expect(policies.refetchOnReconnect).toBe(true)

    clientsApiMocks.getById.mockResolvedValueOnce({})
    await (byId.queryFn as () => Promise<unknown>)()
    expect(clientsApiMocks.getById).toHaveBeenCalledWith(clientId)

    clientsApiMocks.timeline.mockResolvedValueOnce({})
    await (timeline.queryFn as () => Promise<unknown>)()
    expect(clientsApiMocks.timeline).toHaveBeenCalledWith(clientId, { page: 1 })

    clientsApiMocks.policies.mockResolvedValueOnce({})
    await (policies.queryFn as () => Promise<unknown>)()
    expect(clientsApiMocks.policies).toHaveBeenCalledWith(clientId, { page: 1 })
  })
})
