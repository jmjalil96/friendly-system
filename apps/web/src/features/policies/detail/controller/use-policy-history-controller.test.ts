// @vitest-environment jsdom
import { createElement, type ReactElement } from 'react'
import { act, cleanup, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type {
  PolicyHistoryResponse,
  PolicyTimelineResponse,
} from '@friendly-system/shared'
import {
  usePolicyHistoryController,
  type UsePolicyHistoryControllerResult,
} from '@/features/policies/detail/controller/use-policy-history-controller'

const usePolicyHistoryMock = vi.hoisted(() => vi.fn())
const usePolicyTimelineMock = vi.hoisted(() => vi.fn())

vi.mock('@/features/policies/api/policies.hooks', () => ({
  usePolicyHistory: usePolicyHistoryMock,
  usePolicyTimeline: usePolicyTimelineMock,
}))

function makeHistoryResponse(
  overrides: Partial<PolicyHistoryResponse> = {},
): PolicyHistoryResponse {
  return {
    data: [
      {
        id: 'a0000000-0000-4000-8000-000000000011',
        policyId: 'a0000000-0000-4000-8000-000000000001',
        fromStatus: 'PENDING',
        toStatus: 'ACTIVE',
        reason: 'Activación inicial',
        notes: 'Validación completada',
        createdById: 'a0000000-0000-4000-8000-000000000101',
        createdByFirstName: 'Carlos',
        createdByLastName: 'Pérez',
        createdAt: '2026-02-10T10:00:00.000Z',
      },
    ],
    meta: {
      page: 1,
      limit: 20,
      totalCount: 1,
      totalPages: 1,
    },
    ...overrides,
  }
}

function makeTimelineResponse(
  overrides: Partial<PolicyTimelineResponse> = {},
): PolicyTimelineResponse {
  return {
    data: [
      {
        id: 'a0000000-0000-4000-8000-000000000021',
        action: 'policy.updated',
        resource: 'policy',
        resourceId: 'a0000000-0000-4000-8000-000000000001',
        userId: 'a0000000-0000-4000-8000-000000000101',
        userFirstName: 'Carlos',
        userLastName: 'Pérez',
        ipAddress: null,
        userAgent: null,
        metadata: {
          changedFields: ['endDate', 'tPremium'],
        },
        createdAt: '2026-02-10T10:00:00.000Z',
      },
      {
        id: 'a0000000-0000-4000-8000-000000000022',
        action: 'policy.transitioned',
        resource: 'policy',
        resourceId: 'a0000000-0000-4000-8000-000000000001',
        userId: 'a0000000-0000-4000-8000-000000000101',
        userFirstName: null,
        userLastName: null,
        ipAddress: null,
        userAgent: null,
        metadata: {
          fromStatus: 'PENDING',
          toStatus: 'ACTIVE',
          reason: 'Completado',
        },
        createdAt: '2026-02-10T09:00:00.000Z',
      },
    ],
    meta: {
      page: 1,
      limit: 20,
      totalCount: 2,
      totalPages: 1,
    },
    ...overrides,
  }
}

describe('usePolicyHistoryController', () => {
  let latest: UsePolicyHistoryControllerResult | null = null
  const historyRefetch = vi.fn()
  const timelineRefetch = vi.fn()
  let historyResponse: PolicyHistoryResponse
  let timelineResponse: PolicyTimelineResponse
  let historyIsLoading = false
  let timelineIsLoading = false
  let historyIsError = false
  let timelineIsError = false

  function Harness({ policyId }: { policyId: string }): ReactElement {
    latest = usePolicyHistoryController({ policyId })
    return createElement('div')
  }

  beforeEach(() => {
    latest = null
    historyRefetch.mockReset()
    timelineRefetch.mockReset()
    historyRefetch.mockResolvedValue(undefined)
    timelineRefetch.mockResolvedValue(undefined)

    historyResponse = makeHistoryResponse()
    timelineResponse = makeTimelineResponse()
    historyIsLoading = false
    timelineIsLoading = false
    historyIsError = false
    timelineIsError = false

    usePolicyHistoryMock.mockReset()
    usePolicyTimelineMock.mockReset()

    usePolicyHistoryMock.mockImplementation(() => ({
      data: historyResponse,
      isLoading: historyIsLoading,
      isError: historyIsError,
      refetch: historyRefetch,
    }))

    usePolicyTimelineMock.mockImplementation(() => ({
      data: timelineResponse,
      isLoading: timelineIsLoading,
      isError: timelineIsError,
      refetch: timelineRefetch,
    }))
  })

  afterEach(() => {
    cleanup()
  })

  it('calls history and timeline hooks with independent default pagination', () => {
    render(createElement(Harness, { policyId: 'policy-id-1' }))

    expect(usePolicyHistoryMock).toHaveBeenCalledWith('policy-id-1', {
      page: 1,
      limit: 20,
    })
    expect(usePolicyTimelineMock).toHaveBeenCalledWith('policy-id-1', {
      page: 1,
      limit: 20,
    })
  })

  it('updates pagination independently for history and timeline sections', () => {
    historyResponse = makeHistoryResponse({
      meta: { page: 1, limit: 20, totalCount: 40, totalPages: 4 },
    })
    timelineResponse = makeTimelineResponse({
      meta: { page: 1, limit: 20, totalCount: 40, totalPages: 4 },
    })

    render(createElement(Harness, { policyId: 'policy-id-1' }))

    act(() => {
      latest?.historySection.pagination.onNextPage()
    })

    expect(latest?.historySection.pagination.page).toBe(2)
    expect(latest?.timelineSection.pagination.page).toBe(1)

    act(() => {
      latest?.timelineSection.pagination.onNextPage()
    })

    expect(latest?.historySection.pagination.page).toBe(2)
    expect(latest?.timelineSection.pagination.page).toBe(2)
  })

  it('resets section pagination state when policy id changes', () => {
    historyResponse = makeHistoryResponse({
      meta: { page: 1, limit: 20, totalCount: 40, totalPages: 4 },
    })
    timelineResponse = makeTimelineResponse({
      meta: { page: 1, limit: 20, totalCount: 40, totalPages: 4 },
    })

    const { rerender } = render(
      createElement(Harness, { policyId: 'policy-id-1' }),
    )

    act(() => {
      latest?.historySection.pagination.onNextPage()
      latest?.timelineSection.pagination.onLimitChange(50)
      latest?.timelineSection.pagination.onNextPage()
    })

    expect(latest?.historySection.pagination.page).toBe(2)
    expect(latest?.timelineSection.pagination.page).toBe(2)
    expect(latest?.timelineSection.pagination.limit).toBe(50)

    rerender(createElement(Harness, { policyId: 'policy-id-2' }))

    expect(latest?.historySection.pagination.page).toBe(1)
    expect(latest?.historySection.pagination.limit).toBe(20)
    expect(latest?.timelineSection.pagination.page).toBe(1)
    expect(latest?.timelineSection.pagination.limit).toBe(20)
  })

  it('maps transition and timeline view models with labels and metadata', () => {
    render(createElement(Harness, { policyId: 'policy-id-1' }))

    expect(latest?.historySection.items[0]?.fromStatusLabel).toBe('Pendiente')
    expect(latest?.historySection.items[0]?.toStatusLabel).toBe('Activa')
    expect(latest?.timelineSection.items[0]?.actionLabel).toBe(
      'Póliza actualizada',
    )
    expect(latest?.timelineSection.items[0]?.metadataLines[0]).toContain(
      'Campos actualizados',
    )
    expect(latest?.timelineSection.items[1]?.metadataLines[0]).toContain(
      'Transición:',
    )
  })
})
