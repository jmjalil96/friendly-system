// @vitest-environment jsdom
import { createElement, type ReactElement } from 'react'
import { act, cleanup, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type {
  ClaimHistoryResponse,
  ClaimTimelineResponse,
} from '@friendly-system/shared'
import {
  useClaimHistoryController,
  type UseClaimHistoryControllerResult,
} from '@/features/claims/detail/controller/use-claim-history-controller'

const useClaimHistoryMock = vi.hoisted(() => vi.fn())
const useClaimTimelineMock = vi.hoisted(() => vi.fn())

vi.mock('@/features/claims/api/claims.hooks', () => ({
  useClaimHistory: useClaimHistoryMock,
  useClaimTimeline: useClaimTimelineMock,
}))

function makeHistoryResponse(
  overrides: Partial<ClaimHistoryResponse> = {},
): ClaimHistoryResponse {
  return {
    data: [
      {
        id: 'a0000000-0000-4000-8000-000000000011',
        claimId: 'a0000000-0000-4000-8000-000000000001',
        fromStatus: 'DRAFT',
        toStatus: 'IN_REVIEW',
        reason: 'Revisión inicial',
        notes: 'Pendiente de validación',
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
  overrides: Partial<ClaimTimelineResponse> = {},
): ClaimTimelineResponse {
  return {
    data: [
      {
        id: 'a0000000-0000-4000-8000-000000000021',
        action: 'claim.updated',
        resource: 'claim',
        resourceId: 'a0000000-0000-4000-8000-000000000001',
        userId: 'a0000000-0000-4000-8000-000000000101',
        userFirstName: 'Carlos',
        userLastName: 'Pérez',
        ipAddress: null,
        userAgent: null,
        metadata: {
          changedFields: ['description', 'amountSubmitted'],
        },
        createdAt: '2026-02-10T10:00:00.000Z',
      },
      {
        id: 'a0000000-0000-4000-8000-000000000022',
        action: 'claim.transitioned',
        resource: 'claim',
        resourceId: 'a0000000-0000-4000-8000-000000000001',
        userId: 'a0000000-0000-4000-8000-000000000101',
        userFirstName: null,
        userLastName: null,
        ipAddress: null,
        userAgent: null,
        metadata: {
          fromStatus: 'DRAFT',
          toStatus: 'IN_REVIEW',
          reason: 'Completado',
        },
        createdAt: '2026-02-10T09:00:00.000Z',
      },
      {
        id: 'a0000000-0000-4000-8000-000000000023',
        action: 'claim.invoice_deleted',
        resource: 'claim',
        resourceId: 'a0000000-0000-4000-8000-000000000001',
        userId: null,
        userFirstName: null,
        userLastName: null,
        ipAddress: null,
        userAgent: null,
        metadata: {
          invoiceId: 'a0000000-0000-4000-8000-000000000031',
        },
        createdAt: '2026-02-10T08:00:00.000Z',
      },
      {
        id: 'a0000000-0000-4000-8000-000000000024',
        action: 'claim.created',
        resource: 'claim',
        resourceId: 'a0000000-0000-4000-8000-000000000001',
        userId: null,
        userFirstName: null,
        userLastName: null,
        ipAddress: null,
        userAgent: null,
        metadata: null,
        createdAt: '2026-02-10T07:00:00.000Z',
      },
    ],
    meta: {
      page: 1,
      limit: 20,
      totalCount: 4,
      totalPages: 1,
    },
    ...overrides,
  }
}

describe('useClaimHistoryController', () => {
  let latest: UseClaimHistoryControllerResult | null = null
  const historyRefetch = vi.fn()
  const timelineRefetch = vi.fn()
  let historyResponse: ClaimHistoryResponse
  let timelineResponse: ClaimTimelineResponse
  let historyIsLoading = false
  let timelineIsLoading = false
  let historyIsError = false
  let timelineIsError = false

  function Harness({ claimId }: { claimId: string }): ReactElement {
    latest = useClaimHistoryController({ claimId })
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

    useClaimHistoryMock.mockReset()
    useClaimTimelineMock.mockReset()

    useClaimHistoryMock.mockImplementation(() => ({
      data: historyResponse,
      isLoading: historyIsLoading,
      isError: historyIsError,
      refetch: historyRefetch,
    }))

    useClaimTimelineMock.mockImplementation(() => ({
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
    render(createElement(Harness, { claimId: 'claim-id-1' }))

    expect(useClaimHistoryMock).toHaveBeenCalledWith('claim-id-1', {
      page: 1,
      limit: 20,
    })
    expect(useClaimTimelineMock).toHaveBeenCalledWith('claim-id-1', {
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

    render(createElement(Harness, { claimId: 'claim-id-1' }))

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

  it('resets section pagination state when claim id changes', () => {
    historyResponse = makeHistoryResponse({
      meta: { page: 1, limit: 20, totalCount: 40, totalPages: 4 },
    })
    timelineResponse = makeTimelineResponse({
      meta: { page: 1, limit: 20, totalCount: 40, totalPages: 4 },
    })

    const { rerender } = render(createElement(Harness, { claimId: 'claim-id-1' }))

    act(() => {
      latest?.historySection.pagination.onNextPage()
      latest?.timelineSection.pagination.onLimitChange(50)
      latest?.timelineSection.pagination.onNextPage()
    })

    expect(latest?.historySection.pagination.page).toBe(2)
    expect(latest?.timelineSection.pagination.page).toBe(2)
    expect(latest?.timelineSection.pagination.limit).toBe(50)

    rerender(createElement(Harness, { claimId: 'claim-id-2' }))

    expect(latest?.historySection.pagination.page).toBe(1)
    expect(latest?.historySection.pagination.limit).toBe(20)
    expect(latest?.timelineSection.pagination.page).toBe(1)
    expect(latest?.timelineSection.pagination.limit).toBe(20)
  })

  it('clamps pages when total pages shrink', () => {
    historyResponse = makeHistoryResponse({
      meta: { page: 1, limit: 20, totalCount: 60, totalPages: 3 },
    })
    timelineResponse = makeTimelineResponse({
      meta: { page: 1, limit: 20, totalCount: 60, totalPages: 3 },
    })

    const { rerender } = render(createElement(Harness, { claimId: 'claim-id-1' }))

    act(() => {
      latest?.historySection.pagination.onNextPage()
      latest?.historySection.pagination.onNextPage()
      latest?.timelineSection.pagination.onNextPage()
    })

    expect(latest?.historySection.pagination.page).toBe(3)
    expect(latest?.timelineSection.pagination.page).toBe(2)

    historyResponse = makeHistoryResponse({
      meta: { page: 1, limit: 20, totalCount: 1, totalPages: 1 },
    })
    timelineResponse = makeTimelineResponse({
      meta: { page: 1, limit: 20, totalCount: 1, totalPages: 1 },
    })

    rerender(createElement(Harness, { claimId: 'claim-id-1' }))

    expect(latest?.historySection.pagination.page).toBe(1)
    expect(latest?.timelineSection.pagination.page).toBe(1)
  })

  it('delegates retry callbacks to each query refetch', () => {
    render(createElement(Harness, { claimId: 'claim-id-1' }))

    act(() => {
      latest?.historySection.onRetry()
      latest?.timelineSection.onRetry()
    })

    expect(historyRefetch).toHaveBeenCalledTimes(1)
    expect(timelineRefetch).toHaveBeenCalledTimes(1)
  })

  it('normalizes transition labels and timeline metadata lines', () => {
    render(createElement(Harness, { claimId: 'claim-id-1' }))

    const transitionItem = latest?.historySection.items[0]
    expect(transitionItem?.fromStatusLabel).toBe('Borrador')
    expect(transitionItem?.toStatusLabel).toBe('En revisión')
    expect(transitionItem?.createdByLabel).toBe('Carlos Pérez')

    const updatedItem = latest?.timelineSection.items.find(
      (item) => item.id === 'a0000000-0000-4000-8000-000000000021',
    )
    const transitionedItem = latest?.timelineSection.items.find(
      (item) => item.id === 'a0000000-0000-4000-8000-000000000022',
    )
    const deletedInvoiceItem = latest?.timelineSection.items.find(
      (item) => item.id === 'a0000000-0000-4000-8000-000000000023',
    )
    const createdItem = latest?.timelineSection.items.find(
      (item) => item.id === 'a0000000-0000-4000-8000-000000000024',
    )

    expect(updatedItem?.actionLabel).toBe('Reclamo actualizado')
    expect(updatedItem?.metadataLines[0]).toContain('Campos actualizados (2)')
    expect(updatedItem?.metadataLines[0]).toContain('description')
    expect(updatedItem?.userLabel).toBe('Carlos Pérez')

    expect(transitionedItem?.actionLabel).toBe('Estado transicionado')
    expect(transitionedItem?.metadataLines).toContain(
      'Transición: Borrador -> En revisión',
    )
    expect(transitionedItem?.metadataLines).toContain('Motivo: Completado')
    expect(transitionedItem?.userLabel).toBe('Usuario')

    expect(deletedInvoiceItem?.actionLabel).toBe('Factura eliminada')
    expect(deletedInvoiceItem?.metadataLines).toContain(
      'Factura ID: a0000000-0000-4000-8000-000000000031',
    )
    expect(deletedInvoiceItem?.userLabel).toBe('Sistema')

    expect(createdItem?.actionLabel).toBe('Reclamo creado')
    expect(createdItem?.metadataLines).toEqual(['Evento registrado'])
    expect(createdItem?.userLabel).toBe('Sistema')
  })
})
