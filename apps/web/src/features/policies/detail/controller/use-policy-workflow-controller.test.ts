// @vitest-environment jsdom
import { createElement, type ReactElement } from 'react'
import { act, cleanup, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { GetPolicyByIdResponse } from '@friendly-system/shared'
import {
  usePolicyWorkflowController,
  type UsePolicyWorkflowControllerResult,
} from '@/features/policies/detail/controller/use-policy-workflow-controller'

const useTransitionPolicyMock = vi.hoisted(() => vi.fn())
const toastSuccessMock = vi.hoisted(() => vi.fn())

vi.mock('@/features/policies/api/policies.hooks', () => ({
  useTransitionPolicy: useTransitionPolicyMock,
}))

vi.mock('@/shared/hooks/use-toast', () => ({
  toast: {
    success: toastSuccessMock,
  },
}))

function makePolicy(
  overrides: Partial<GetPolicyByIdResponse> = {},
): GetPolicyByIdResponse {
  return {
    id: '67f1d6ce-8a62-4d4f-8607-8f5a5e91f6ad',
    policyNumber: 'POL-001',
    status: 'ACTIVE',
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

describe('usePolicyWorkflowController', () => {
  let latest: UsePolicyWorkflowControllerResult | null = null
  const transitionPolicy = vi.fn()

  function Harness({
    policy,
  }: {
    policy?: GetPolicyByIdResponse
  }): ReactElement {
    latest = usePolicyWorkflowController({
      policyId: policy?.id ?? '67f1d6ce-8a62-4d4f-8607-8f5a5e91f6ad',
      policy,
    })

    return createElement('div')
  }

  beforeEach(() => {
    latest = null
    transitionPolicy.mockReset()
    transitionPolicy.mockResolvedValue(undefined)
    useTransitionPolicyMock.mockReset()
    toastSuccessMock.mockReset()

    useTransitionPolicyMock.mockReturnValue({
      transitionPolicy,
      transitionPolicyStatus: 'idle',
    })
  })

  afterEach(() => {
    cleanup()
  })

  it('derives workflow steps and transition actions from shared state machine', () => {
    render(createElement(Harness, { policy: makePolicy({ status: 'ACTIVE' }) }))

    expect(latest?.steps.length).toBeGreaterThan(0)
    expect(latest?.steps.some((step) => step.state === 'current')).toBe(true)
    expect(latest?.actions.map((action) => action.toStatus)).toEqual([
      'SUSPENDED',
      'EXPIRED',
      'CANCELLED',
    ])
  })

  it('requires reason when transition rule demands it', async () => {
    render(createElement(Harness, { policy: makePolicy({ status: 'ACTIVE' }) }))

    act(() => {
      latest?.onActionSelect('SUSPENDED')
    })

    await act(async () => {
      await latest?.onSubmitTransition()
    })

    expect(transitionPolicy).not.toHaveBeenCalled()
    expect(latest?.dialog.error).toBe('Ingresa un motivo para continuar.')
  })

  it('submits transition payload and shows success toast', async () => {
    render(createElement(Harness, { policy: makePolicy({ status: 'ACTIVE' }) }))

    act(() => {
      latest?.onActionSelect('EXPIRED')
      latest?.onReasonChange('  Fin de vigencia  ')
      latest?.onNotesChange('  Cierre de periodo  ')
    })

    await act(async () => {
      await latest?.onSubmitTransition()
    })

    expect(transitionPolicy).toHaveBeenCalledTimes(1)
    expect(transitionPolicy).toHaveBeenCalledWith({
      status: 'EXPIRED',
      reason: 'Fin de vigencia',
      notes: 'Cierre de periodo',
    })
    expect(toastSuccessMock).toHaveBeenCalledWith('Estado actualizado')
    expect(latest?.dialog.open).toBe(false)
  })

  it('resets dialog state when policy id changes', () => {
    const firstPolicy = makePolicy({
      id: '11111111-1111-4111-8111-111111111111',
      status: 'ACTIVE',
    })
    const secondPolicy = makePolicy({
      id: '22222222-2222-4222-8222-222222222222',
      status: 'ACTIVE',
    })

    const { rerender } = render(createElement(Harness, { policy: firstPolicy }))

    act(() => {
      latest?.onActionSelect('SUSPENDED')
      latest?.onReasonChange('Falta documentación')
      latest?.onNotesChange('Pendiente de revisión')
    })

    expect(latest?.dialog.open).toBe(true)
    expect(latest?.dialog.action?.toStatus).toBe('SUSPENDED')
    expect(latest?.dialog.reason).toBe('Falta documentación')
    expect(latest?.dialog.notes).toBe('Pendiente de revisión')

    rerender(createElement(Harness, { policy: secondPolicy }))

    expect(latest?.dialog.open).toBe(false)
    expect(latest?.dialog.action).toBeUndefined()
    expect(latest?.dialog.reason).toBe('')
    expect(latest?.dialog.notes).toBe('')
    expect(latest?.dialog.error).toBeUndefined()
  })

  it('returns no transition actions for terminal statuses', () => {
    render(
      createElement(Harness, {
        policy: makePolicy({ status: 'CANCELLED' }),
      }),
    )

    expect(latest?.actions).toHaveLength(0)
  })
})
