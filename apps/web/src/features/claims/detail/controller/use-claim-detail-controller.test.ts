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

vi.mock('@/features/claims/api/claims.hooks', () => ({
  useClaimById: useClaimByIdMock,
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
    refetchMock.mockResolvedValue(undefined)
    useClaimByIdMock.mockReset()

    useClaimByIdMock.mockReturnValue({
      data: makeClaim(),
      isLoading: false,
      isError: false,
      refetch: refetchMock,
    })
  })

  afterEach(() => {
    cleanup()
  })

  it('maps loaded claim query state into header and tabs props', () => {
    render(createElement(Harness, { claimId: 'claim-id' }))

    expect(latest?.headerProps.subtitle).toBe('Reclamo #42')
    expect(latest?.headerProps.onBack).toBe(onBackMock)
    expect(latest?.tabsProps.claimId).toBe('claim-id')
    expect(latest?.tabsProps.claim).toEqual(makeClaim())
    expect(latest?.tabsProps.isLoading).toBe(false)
    expect(latest?.tabsProps.isError).toBe(false)
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
    expect(latest?.tabsProps.isError).toBe(true)
  })

  it('delegates retry action to claim query refetch', () => {
    render(createElement(Harness, { claimId: 'claim-id' }))

    act(() => {
      latest?.tabsProps.onRetry()
    })

    expect(refetchMock).toHaveBeenCalledTimes(1)
  })
})
