// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { GetPolicyByIdResponse } from '@friendly-system/shared'

const usePolicyDetailMainControllerMock = vi.hoisted(() => vi.fn())
const usePolicyWorkflowControllerMock = vi.hoisted(() => vi.fn())

vi.mock(
  '@/features/policies/detail/controller/use-policy-detail-main-controller',
  () => ({
    usePolicyDetailMainController: usePolicyDetailMainControllerMock,
  }),
)

vi.mock(
  '@/features/policies/detail/controller/use-policy-workflow-controller',
  () => ({
    usePolicyWorkflowController: usePolicyWorkflowControllerMock,
  }),
)

import { PolicyDetailMainTab } from '@/features/policies/detail/ui/policy-detail-main-tab'

const POLICY: GetPolicyByIdResponse = {
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
}

describe('PolicyDetailMainTab', () => {
  beforeEach(() => {
    usePolicyDetailMainControllerMock.mockReset()
    usePolicyWorkflowControllerMock.mockReset()
    usePolicyDetailMainControllerMock.mockReturnValue({
      sections: [],
      summary: {
        items: [],
        statusLabel: 'Activa',
        statusClassName:
          'bg-[var(--color-green-50)] text-[var(--color-green-700)]',
      },
    })
    usePolicyWorkflowControllerMock.mockReturnValue({
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
      <PolicyDetailMainTab
        policyId={POLICY.id}
        policy={undefined}
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
      <PolicyDetailMainTab
        policyId={POLICY.id}
        policy={undefined}
        isLoading={false}
        isError
        onRetry={onRetry}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /Reintentar/i }))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('renders orchestrated wrappers and two-column sections layout', () => {
    usePolicyDetailMainControllerMock.mockReturnValue({
      sections: [
        {
          key: 'core',
          title: 'Datos principales',
          subtitle: 'Identificación y vigencia de la póliza',
          fields: [
            {
              label: 'Número',
              displayValue: 'POL-001',
              variant: 'text',
              editable: true,
              isEditing: false,
              isSaving: false,
              draftValue: 'POL-001',
              onDraftChange: vi.fn(),
              onStartEdit: vi.fn(),
              onSave: vi.fn(),
              onCancel: vi.fn(),
            },
            {
              label: 'Prima titular',
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
          { label: 'Nro. póliza', value: 'POL-001' },
          { label: 'Cliente', value: 'Empresas Alpha S.A.' },
        ],
        statusLabel: 'Activa',
        statusClassName:
          'bg-[var(--color-green-50)] text-[var(--color-green-700)]',
      },
    })

    usePolicyWorkflowControllerMock.mockReturnValue({
      steps: [
        { id: 'PENDING', label: 'Pendiente', state: 'completed' },
        { id: 'ACTIVE', label: 'Activa', state: 'current' },
      ],
      actions: [
        {
          toStatus: 'SUSPENDED',
          label: 'Cambiar a Suspendida',
          requiresReason: true,
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
      <PolicyDetailMainTab
        policyId={POLICY.id}
        policy={POLICY}
        isLoading={false}
        isError={false}
        onRetry={vi.fn()}
      />,
    )

    expect(screen.queryByText('Datos principales')).not.toBeNull()
    expect(screen.queryByText('Resumen')).not.toBeNull()
    expect(screen.queryByText('Flujo')).not.toBeNull()
    expect(
      screen.queryByRole('button', { name: 'Cambiar a Suspendida' }),
    ).not.toBeNull()
    expect(screen.getAllByRole('button', { name: /Editar/i })).toHaveLength(1)
    expect(container.querySelector('[class*="md:grid-cols-2"]')).not.toBeNull()
  })
})
