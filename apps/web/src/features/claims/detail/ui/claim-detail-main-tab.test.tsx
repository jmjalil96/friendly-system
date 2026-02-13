// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { GetClaimByIdResponse } from '@friendly-system/shared'

const useClaimDetailMainControllerMock = vi.hoisted(() => vi.fn())
const useClaimWorkflowControllerMock = vi.hoisted(() => vi.fn())

vi.mock(
  '@/features/claims/detail/controller/use-claim-detail-main-controller',
  () => ({
    useClaimDetailMainController: useClaimDetailMainControllerMock,
  }),
)

vi.mock(
  '@/features/claims/detail/controller/use-claim-workflow-controller',
  () => ({
    useClaimWorkflowController: useClaimWorkflowControllerMock,
  }),
)

import { ClaimDetailMainTab } from '@/features/claims/detail/ui/claim-detail-main-tab'

const CLAIM: GetClaimByIdResponse = {
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
}

describe('ClaimDetailMainTab', () => {
  beforeEach(() => {
    useClaimDetailMainControllerMock.mockReset()
    useClaimWorkflowControllerMock.mockReset()
    useClaimDetailMainControllerMock.mockReturnValue({
      sections: [],
      summary: {
        items: [],
        statusLabel: 'En revision',
        statusClassName:
          'bg-[var(--color-amber-50)] text-[var(--color-amber-600)]',
      },
    })
    useClaimWorkflowControllerMock.mockReturnValue({
      steps: [],
      actions: [],
      dialog: {
        open: false,
        reason: '',
        notes: '',
        isSubmitting: false,
      },
      onActionSelect: vi.fn(),
      onDialogOpenChange: vi.fn(),
      onReasonChange: vi.fn(),
      onNotesChange: vi.fn(),
      onSubmitTransition: vi.fn(),
    })
  })

  afterEach(() => {
    cleanup()
  })

  it('renders loading skeleton state', () => {
    const { container } = render(
      <ClaimDetailMainTab
        claimId={CLAIM.id}
        claim={undefined}
        isLoading
        isError={false}
        onRetry={vi.fn()}
      />,
    )

    expect(
      container.querySelectorAll('[data-slot="skeleton"]').length,
    ).toBeGreaterThan(0)
  })

  it('renders error state and retries', () => {
    const onRetry = vi.fn()

    render(
      <ClaimDetailMainTab
        claimId={CLAIM.id}
        claim={undefined}
        isLoading={false}
        isError
        onRetry={onRetry}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /Reintentar/i }))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('renders orchestrated wrappers and two-column sections layout', () => {
    useClaimDetailMainControllerMock.mockReturnValue({
      sections: [
        {
          key: 'core',
          title: 'Datos principales',
          subtitle: 'Contexto del reclamo',
          fields: [
            {
              label: 'Descripcion',
              displayValue: 'Descripcion inicial',
              variant: 'text',
              editable: true,
              isEditing: false,
              isSaving: false,
              draftValue: 'Descripcion inicial',
              onDraftChange: vi.fn(),
              onStartEdit: vi.fn(),
              onSave: vi.fn(),
              onCancel: vi.fn(),
            },
            {
              label: 'Monto aprobado',
              displayValue: 'Sin dato',
              variant: 'decimal',
              editable: false,
              isEditing: false,
              isSaving: false,
              draftValue: '',
              onDraftChange: vi.fn(),
              onStartEdit: vi.fn(),
              onSave: vi.fn(),
              onCancel: vi.fn(),
            },
          ],
        },
      ],
      summary: {
        items: [
          { label: 'Nro. reclamo', value: '#25' },
          { label: 'Cliente', value: 'Empresas Alpha S.A.' },
        ],
        statusLabel: 'En revision',
        statusClassName:
          'bg-[var(--color-amber-50)] text-[var(--color-amber-600)]',
      },
    })

    useClaimWorkflowControllerMock.mockReturnValue({
      steps: [
        { id: 'DRAFT', label: 'Borrador', state: 'completed' },
        { id: 'IN_REVIEW', label: 'En revision', state: 'current' },
      ],
      actions: [
        {
          toStatus: 'SUBMITTED',
          label: 'Cambiar a Enviado',
          requiresReason: false,
        },
      ],
      dialog: {
        open: false,
        reason: '',
        notes: '',
        isSubmitting: false,
      },
      onActionSelect: vi.fn(),
      onDialogOpenChange: vi.fn(),
      onReasonChange: vi.fn(),
      onNotesChange: vi.fn(),
      onSubmitTransition: vi.fn(),
    })

    const { container } = render(
      <ClaimDetailMainTab
        claimId={CLAIM.id}
        claim={CLAIM}
        isLoading={false}
        isError={false}
        onRetry={vi.fn()}
      />,
    )

    expect(screen.queryByText('Datos principales')).not.toBeNull()
    expect(screen.queryByText('Resumen')).not.toBeNull()
    expect(screen.queryByText('Flujo')).not.toBeNull()
    expect(
      screen.queryByRole('button', { name: 'Cambiar a Enviado' }),
    ).not.toBeNull()
    expect(screen.getAllByRole('button', { name: /Editar/i })).toHaveLength(1)
    expect(container.querySelector('[class*="md:grid-cols-2"]')).not.toBeNull()
  })
})
