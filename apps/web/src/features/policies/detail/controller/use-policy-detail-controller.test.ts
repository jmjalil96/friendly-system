// @vitest-environment jsdom
import { createElement, type ReactElement } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, render } from '@testing-library/react'
import type { GetPolicyByIdResponse } from '@friendly-system/shared'
import {
  usePolicyDetailController,
  type UsePolicyDetailControllerResult,
} from '@/features/policies/detail/controller/use-policy-detail-controller'

const usePolicyByIdMock = vi.hoisted(() => vi.fn())
const useDeletePolicyMock = vi.hoisted(() => vi.fn())

vi.mock('@/features/policies/api/policies.hooks', () => ({
  usePolicyById: usePolicyByIdMock,
  useDeletePolicy: useDeletePolicyMock,
}))

function makePolicy(
  overrides: Partial<GetPolicyByIdResponse> = {},
): GetPolicyByIdResponse {
  return {
    id: '67f1d6ce-8a62-4d4f-8607-8f5a5e91f6ad',
    policyNumber: 'POL-001',
    status: 'PENDING',
    clientId: 'd6a9d8a4-e0e2-4e99-aece-798f9047e0a6',
    clientName: 'Empresas Alpha S.A.',
    insurerId: 'ba7b5f90-1214-412d-b1bf-b41228d9f621',
    insurerName: 'Aseguradora Uno',
    type: 'HEALTH',
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    ambulatoryCoinsurancePct: null,
    hospitalaryCoinsurancePct: null,
    maternityCost: null,
    tPremium: null,
    tplus1Premium: null,
    tplusfPremium: null,
    benefitsCostPerPerson: null,
    maxCoverage: '500000.00',
    deductible: '1200.00',
    planName: 'Plan Corporativo',
    employeeClass: 'Administrativo',
    cancellationReason: null,
    cancelledAt: null,
    createdAt: '2026-02-10T10:00:00.000Z',
    updatedAt: '2026-02-10T11:00:00.000Z',
    ...overrides,
  }
}

describe('usePolicyDetailController', () => {
  let latest: UsePolicyDetailControllerResult | null = null
  const onBackMock = vi.fn()
  const refetchMock = vi.fn()
  const deletePolicyMock = vi.fn()
  let deletePolicyStatus: 'idle' | 'pending' | 'success' | 'error' = 'idle'

  function Harness({ policyId }: { policyId: string }): ReactElement {
    latest = usePolicyDetailController({
      policyId,
      onBack: onBackMock,
    })

    return createElement('div')
  }

  beforeEach(() => {
    latest = null
    onBackMock.mockReset()
    refetchMock.mockReset()
    deletePolicyMock.mockReset()
    refetchMock.mockResolvedValue(undefined)
    deletePolicyMock.mockResolvedValue(undefined)
    deletePolicyStatus = 'idle'
    usePolicyByIdMock.mockReset()
    useDeletePolicyMock.mockReset()

    usePolicyByIdMock.mockReturnValue({
      data: makePolicy(),
      isLoading: false,
      isError: false,
      refetch: refetchMock,
    })

    useDeletePolicyMock.mockImplementation(() => ({
      deletePolicy: deletePolicyMock,
      deletePolicyStatus,
    }))
  })

  afterEach(() => {
    cleanup()
  })

  it('maps loaded policy query state into header and tabs props', () => {
    render(createElement(Harness, { policyId: 'policy-id' }))

    expect(latest?.headerProps.subtitle).toBe('Póliza POL-001')
    expect(latest?.headerProps.onBack).toBe(onBackMock)
    expect(latest?.headerProps.actions.canDelete).toBe(true)
    expect(latest?.headerProps.actions.isDeleting).toBe(false)
    expect(latest?.tabsProps.policyId).toBe('policy-id')
    expect(latest?.tabsProps.policy).toEqual(makePolicy())
    expect(latest?.tabsProps.isLoading).toBe(false)
    expect(latest?.tabsProps.isError).toBe(false)
    expect(latest?.deleteDialogProps.open).toBe(false)
    expect(latest?.deleteDialogProps.policyNumber).toBe('POL-001')
    expect(latest?.deleteDialogProps.isDeleting).toBe(false)
  })

  it('uses loading subtitle while policy query is pending', () => {
    usePolicyByIdMock.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      refetch: refetchMock,
    })

    render(createElement(Harness, { policyId: 'policy-id' }))

    expect(latest?.headerProps.subtitle).toBe('Cargando póliza...')
    expect(latest?.headerProps.actions.canDelete).toBe(false)
    expect(latest?.tabsProps.policy).toBeUndefined()
    expect(latest?.tabsProps.isLoading).toBe(true)
  })

  it('delegates retry action to policy query refetch', () => {
    render(createElement(Harness, { policyId: 'policy-id' }))

    act(() => {
      latest?.tabsProps.onRetry()
    })

    expect(refetchMock).toHaveBeenCalledTimes(1)
  })

  it('opens and confirms delete dialog with current policy id', async () => {
    render(createElement(Harness, { policyId: 'policy-id' }))

    act(() => {
      latest?.headerProps.actions.onDeleteRequest()
    })
    expect(latest?.deleteDialogProps.open).toBe(true)

    await act(async () => {
      await latest?.deleteDialogProps.onConfirmDelete()
    })

    expect(deletePolicyMock).toHaveBeenCalledTimes(1)
    expect(deletePolicyMock).toHaveBeenCalledWith('policy-id')
  })

  it('keeps delete dialog open while deletion is pending', () => {
    deletePolicyStatus = 'pending'

    render(createElement(Harness, { policyId: 'policy-id' }))

    act(() => {
      latest?.deleteDialogProps.onOpenChange(true)
    })
    expect(latest?.deleteDialogProps.open).toBe(true)

    act(() => {
      latest?.deleteDialogProps.onOpenChange(false)
    })
    expect(latest?.deleteDialogProps.open).toBe(true)
  })
})
