// @vitest-environment jsdom
import { createElement, type ReactElement } from 'react'
import { act, cleanup, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { GetClaimByIdResponse } from '@friendly-system/shared'
import {
  useClaimWorkflowController,
  type UseClaimWorkflowControllerResult,
} from '@/features/claims/detail/controller/use-claim-workflow-controller'

const useTransitionClaimMock = vi.hoisted(() => vi.fn())
const toastSuccessMock = vi.hoisted(() => vi.fn())

vi.mock('@/features/claims/api/claims.hooks', () => ({
  useTransitionClaim: useTransitionClaimMock,
}))

vi.mock('@/shared/hooks/use-toast', () => ({
  toast: {
    success: toastSuccessMock,
  },
}))

function makeClaim(
  overrides: Partial<GetClaimByIdResponse> = {},
): GetClaimByIdResponse {
  return {
    id: '67f1d6ce-8a62-4d4f-8607-8f5a5e91f6ad',
    claimNumber: 25,
    status: 'IN_REVIEW',
    clientId: 'd6a9d8a4-e0e2-4e99-aece-798f9047e0a6',
    clientName: 'Empresas Alpha S.A.',
    affiliateId: 'b3f4fc33-6efa-45d0-b4dc-a84ca58e9f5b',
    affiliateFirstName: 'Carlos',
    affiliateLastName: 'Perez',
    patientId: 'ba7b5f90-1214-412d-b1bf-b41228d9f621',
    patientFirstName: 'Ana',
    patientLastName: 'Perez',
    policyId: null,
    policyNumber: null,
    policyInsurerName: null,
    description: 'Descripcion inicial',
    careType: null,
    diagnosis: null,
    amountSubmitted: null,
    amountApproved: null,
    amountDenied: null,
    amountUnprocessed: null,
    deductibleApplied: null,
    copayApplied: null,
    incidentDate: null,
    submittedDate: null,
    settlementDate: null,
    businessDays: null,
    settlementNumber: null,
    settlementNotes: null,
    createdById: '767d408a-fabf-47ca-971e-1f86d0cf26c5',
    updatedById: null,
    createdAt: '2026-02-10T10:00:00.000Z',
    updatedAt: '2026-02-10T11:00:00.000Z',
    ...overrides,
  }
}

describe('useClaimWorkflowController', () => {
  let latest: UseClaimWorkflowControllerResult | null = null
  const transitionClaim = vi.fn()

  function Harness({ claim }: { claim?: GetClaimByIdResponse }): ReactElement {
    latest = useClaimWorkflowController({
      claimId: claim?.id ?? '67f1d6ce-8a62-4d4f-8607-8f5a5e91f6ad',
      claim,
    })

    return createElement('div')
  }

  beforeEach(() => {
    latest = null
    transitionClaim.mockReset()
    transitionClaim.mockResolvedValue(undefined)
    useTransitionClaimMock.mockReset()
    toastSuccessMock.mockReset()

    useTransitionClaimMock.mockReturnValue({
      transitionClaim,
      transitionClaimStatus: 'idle',
    })
  })

  afterEach(() => {
    cleanup()
  })

  it('derives workflow steps and transition actions from shared state machine', () => {
    render(
      createElement(Harness, { claim: makeClaim({ status: 'IN_REVIEW' }) }),
    )

    expect(latest?.steps.length).toBeGreaterThan(0)
    expect(latest?.steps.some((step) => step.state === 'current')).toBe(true)
    expect(latest?.actions.map((action) => action.toStatus)).toEqual([
      'SUBMITTED',
      'RETURNED',
      'CANCELLED',
    ])
  })

  it('requires reason when transition rule demands it', async () => {
    render(
      createElement(Harness, { claim: makeClaim({ status: 'IN_REVIEW' }) }),
    )

    act(() => {
      latest?.onActionSelect('RETURNED')
    })

    await act(async () => {
      await latest?.onSubmitTransition()
    })

    expect(transitionClaim).not.toHaveBeenCalled()
    expect(latest?.dialog.error).toBe('Ingresa un motivo para continuar.')
  })

  it('submits transition payload and shows success toast', async () => {
    render(
      createElement(Harness, { claim: makeClaim({ status: 'IN_REVIEW' }) }),
    )

    act(() => {
      latest?.onActionSelect('SUBMITTED')
      latest?.onReasonChange('  Documento completo  ')
      latest?.onNotesChange('  Validado por analista  ')
    })

    await act(async () => {
      await latest?.onSubmitTransition()
    })

    expect(transitionClaim).toHaveBeenCalledTimes(1)
    expect(transitionClaim).toHaveBeenCalledWith({
      status: 'SUBMITTED',
      reason: 'Documento completo',
      notes: 'Validado por analista',
    })
    expect(toastSuccessMock).toHaveBeenCalledWith('Estado actualizado')
    expect(latest?.dialog.open).toBe(false)
  })

  it('resets dialog state when claim id changes', async () => {
    const firstClaim = makeClaim({
      id: '11111111-1111-4111-8111-111111111111',
      status: 'IN_REVIEW',
    })
    const secondClaim = makeClaim({
      id: '22222222-2222-4222-8222-222222222222',
      status: 'IN_REVIEW',
    })

    const { rerender } = render(createElement(Harness, { claim: firstClaim }))

    act(() => {
      latest?.onActionSelect('RETURNED')
      latest?.onReasonChange('Falta documentación')
      latest?.onNotesChange('Pendiente de soporte')
    })

    expect(latest?.dialog.open).toBe(true)
    expect(latest?.dialog.action?.toStatus).toBe('RETURNED')
    expect(latest?.dialog.reason).toBe('Falta documentación')
    expect(latest?.dialog.notes).toBe('Pendiente de soporte')

    rerender(createElement(Harness, { claim: secondClaim }))

    expect(latest?.dialog.open).toBe(false)
    expect(latest?.dialog.action).toBeUndefined()
    expect(latest?.dialog.reason).toBe('')
    expect(latest?.dialog.notes).toBe('')
    expect(latest?.dialog.error).toBeUndefined()

    await act(async () => {
      await latest?.onSubmitTransition()
    })

    expect(transitionClaim).not.toHaveBeenCalled()
  })

  it('returns no transition actions for terminal statuses', () => {
    render(createElement(Harness, { claim: makeClaim({ status: 'SETTLED' }) }))

    expect(latest?.actions).toHaveLength(0)
  })
})
