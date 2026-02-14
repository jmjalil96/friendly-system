import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  insurerByIdQueryOptions,
  insurerTimelineQueryOptions,
  listInsurersQueryOptions,
} from '@/features/insurers/api/insurers.hooks'
import {
  INSURERS_LIST_QUERY_KEY,
  INSURERS_OPERATIONAL_QUERY_OPTIONS,
  INSURERS_QUERY_KEY,
} from '@/features/insurers/api/insurers.query-keys'

const insurersApiMocks = vi.hoisted(() => ({
  list: vi.fn(),
  getById: vi.fn(),
  timeline: vi.fn(),
}))

vi.mock('@/features/insurers/api/insurers.api', () => ({
  insurersApi: insurersApiMocks,
}))

describe('insurers query cache policy', () => {
  beforeEach(() => {
    insurersApiMocks.list.mockReset()
    insurersApiMocks.getById.mockReset()
    insurersApiMocks.timeline.mockReset()
  })

  it('applies operational cache policy to list insurers', async () => {
    const filters = { search: 'salud', page: 2, limit: 20 } as const
    const options = listInsurersQueryOptions(filters)

    expect(options.queryKey).toEqual([...INSURERS_LIST_QUERY_KEY, filters])
    expect(options.staleTime).toBe(INSURERS_OPERATIONAL_QUERY_OPTIONS.staleTime)
    expect(options.refetchOnWindowFocus).toBe(
      INSURERS_OPERATIONAL_QUERY_OPTIONS.refetchOnWindowFocus,
    )
    expect(options.refetchOnReconnect).toBe(
      INSURERS_OPERATIONAL_QUERY_OPTIONS.refetchOnReconnect,
    )
    expect(options.refetchInterval).toBeUndefined()

    insurersApiMocks.list.mockResolvedValueOnce({ data: [], meta: {} })
    await (options.queryFn as () => Promise<unknown>)()
    expect(insurersApiMocks.list).toHaveBeenCalledWith(filters)
  })

  it('applies operational policy to detail/timeline and keeps enabled guards', async () => {
    const insurerId = '550e8400-e29b-41d4-a716-446655440000'

    const byId = insurerByIdQueryOptions(insurerId)
    expect(byId.queryKey).toEqual([...INSURERS_QUERY_KEY, insurerId])
    expect(byId.enabled).toBe(true)
    expect(byId.staleTime).toBe(INSURERS_OPERATIONAL_QUERY_OPTIONS.staleTime)
    expect(byId.refetchOnWindowFocus).toBe(true)
    expect(byId.refetchOnReconnect).toBe(true)
    expect(byId.refetchInterval).toBeUndefined()

    const byIdDisabled = insurerByIdQueryOptions('')
    expect(byIdDisabled.enabled).toBe(false)

    const timeline = insurerTimelineQueryOptions(insurerId, { page: 1 })
    expect(timeline.queryKey).toEqual([
      ...INSURERS_QUERY_KEY,
      insurerId,
      'timeline',
      { page: 1 },
    ])
    expect(timeline.staleTime).toBe(
      INSURERS_OPERATIONAL_QUERY_OPTIONS.staleTime,
    )
    expect(timeline.refetchOnWindowFocus).toBe(true)
    expect(timeline.refetchOnReconnect).toBe(true)

    insurersApiMocks.getById.mockResolvedValueOnce({})
    await (byId.queryFn as () => Promise<unknown>)()
    expect(insurersApiMocks.getById).toHaveBeenCalledWith(insurerId)

    insurersApiMocks.timeline.mockResolvedValueOnce({})
    await (timeline.queryFn as () => Promise<unknown>)()
    expect(insurersApiMocks.timeline).toHaveBeenCalledWith(insurerId, {
      page: 1,
    })
  })
})
