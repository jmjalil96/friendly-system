// @vitest-environment jsdom
import { createElement, type ReactElement } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, render } from '@testing-library/react'
import type { GetClaimByIdResponse } from '@friendly-system/shared'
import {
  useClaimDetailController,
  type UseClaimDetailControllerResult,
} from '@/features/claims/detail/controller/use-claim-detail-controller'

const useClaimByIdMock = vi.hoisted(() => vi.fn())
const useDeleteClaimMock = vi.hoisted(() => vi.fn())

vi.mock('@/features/claims/api/claims.hooks', () => ({
  useClaimById: useClaimByIdMock,
  useDeleteClaim: useDeleteClaimMock,
}))

function makeClaim(
  overrides: Partial<GetClaimByIdResponse> = {},
): GetClaimByIdResponse {
  return {
    claimNumber: 42,
    ...overrides,
  } as GetClaimByIdResponse
}

describe('useClaimDetailController', () => {
  let latest: UseClaimDetailControllerResult | null = null
  const onBackMock = vi.fn()
  const refetchMock = vi.fn()
  const deleteClaimMock = vi.fn()
  let deleteClaimStatus: 'idle' | 'pending' | 'success' | 'error' = 'idle'

  function Harness({ claimId }: { claimId: string }): ReactElement {
    latest = useClaimDetailController({
      claimId,
      onBack: onBackMock,
    })

    return createElement('div')
  }

  beforeEach(() => {
    latest = null
    onBackMock.mockReset()
    refetchMock.mockReset()
    deleteClaimMock.mockReset()
    refetchMock.mockResolvedValue(undefined)
    deleteClaimMock.mockResolvedValue(undefined)
    deleteClaimStatus = 'idle'
    useClaimByIdMock.mockReset()
    useDeleteClaimMock.mockReset()

    useClaimByIdMock.mockReturnValue({
      data: makeClaim(),
      isLoading: false,
      isError: false,
      refetch: refetchMock,
    })

    useDeleteClaimMock.mockImplementation(() => ({
      deleteClaim: deleteClaimMock,
      deleteClaimStatus,
    }))
  })

  afterEach(() => {
    cleanup()
  })

  it('maps loaded claim query state into header and tabs props', () => {
    render(createElement(Harness, { claimId: 'claim-id' }))

    expect(latest?.headerProps.subtitle).toBe('Reclamo #42')
    expect(latest?.headerProps.onBack).toBe(onBackMock)
    expect(latest?.headerProps.actions.canDelete).toBe(true)
    expect(latest?.headerProps.actions.isDeleting).toBe(false)
    expect(latest?.tabsProps.claimId).toBe('claim-id')
    expect(latest?.tabsProps.claim).toEqual(makeClaim())
    expect(latest?.tabsProps.isLoading).toBe(false)
    expect(latest?.tabsProps.isError).toBe(false)
    expect(latest?.deleteDialogProps.open).toBe(false)
    expect(latest?.deleteDialogProps.claimNumber).toBe(42)
    expect(latest?.deleteDialogProps.isDeleting).toBe(false)
  })

  it('uses loading subtitle while claim query is pending', () => {
    useClaimByIdMock.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      refetch: refetchMock,
    })

    render(createElement(Harness, { claimId: 'claim-id' }))

    expect(latest?.headerProps.subtitle).toBe('Cargando reclamo...')
    expect(latest?.headerProps.actions.canDelete).toBe(false)
    expect(latest?.tabsProps.claim).toBeUndefined()
    expect(latest?.tabsProps.isLoading).toBe(true)
  })

  it('uses fallback subtitle when claim data is unavailable', () => {
    useClaimByIdMock.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch: refetchMock,
    })

    render(createElement(Harness, { claimId: 'claim-id' }))

    expect(latest?.headerProps.subtitle).toBe(
      'No pudimos cargar el numero de reclamo',
    )
    expect(latest?.headerProps.actions.canDelete).toBe(false)
    expect(latest?.tabsProps.isError).toBe(true)
  })

  it('delegates retry action to claim query refetch', () => {
    render(createElement(Harness, { claimId: 'claim-id' }))

    act(() => {
      latest?.tabsProps.onRetry()
    })

    expect(refetchMock).toHaveBeenCalledTimes(1)
  })

  it('opens delete dialog when delete action is requested', () => {
    render(createElement(Harness, { claimId: 'claim-id' }))

    act(() => {
      latest?.headerProps.actions.onDeleteRequest()
    })

    expect(latest?.deleteDialogProps.open).toBe(true)
  })

  it('closes delete dialog when open state changes and mutation is idle', () => {
    render(createElement(Harness, { claimId: 'claim-id' }))

    act(() => {
      latest?.headerProps.actions.onDeleteRequest()
    })
    expect(latest?.deleteDialogProps.open).toBe(true)

    act(() => {
      latest?.deleteDialogProps.onOpenChange(false)
    })
    expect(latest?.deleteDialogProps.open).toBe(false)
  })

  it('keeps delete dialog open while deletion is pending', () => {
    deleteClaimStatus = 'pending'

    render(createElement(Harness, { claimId: 'claim-id' }))

    act(() => {
      latest?.deleteDialogProps.onOpenChange(true)
    })
    expect(latest?.deleteDialogProps.open).toBe(true)

    act(() => {
      latest?.deleteDialogProps.onOpenChange(false)
    })
    expect(latest?.deleteDialogProps.open).toBe(true)
  })

  it('calls delete mutation with current claim id on confirm delete', async () => {
    render(createElement(Harness, { claimId: 'claim-id' }))

    await act(async () => {
      await latest?.deleteDialogProps.onConfirmDelete()
    })

    expect(deleteClaimMock).toHaveBeenCalledTimes(1)
    expect(deleteClaimMock).toHaveBeenCalledWith('claim-id')
  })

  it('blocks delete request and delete confirm when claim cannot be deleted', async () => {
    useClaimByIdMock.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch: refetchMock,
    })

    render(createElement(Harness, { claimId: 'claim-id' }))

    act(() => {
      latest?.headerProps.actions.onDeleteRequest()
    })

    expect(latest?.deleteDialogProps.open).toBe(false)

    await act(async () => {
      await latest?.deleteDialogProps.onConfirmDelete()
    })

    expect(deleteClaimMock).not.toHaveBeenCalled()
  })
})
