// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { ClaimWorkflowCard } from '@/features/claims/detail/ui/workflow/claim-workflow-card'

describe('ClaimWorkflowCard', () => {
  const onActionSelect = vi.fn()
  const onDialogOpenChange = vi.fn()
  const onReasonChange = vi.fn()
  const onNotesChange = vi.fn()
  const onSubmitTransition = vi.fn()

  beforeEach(() => {
    onActionSelect.mockReset()
    onDialogOpenChange.mockReset()
    onReasonChange.mockReset()
    onNotesChange.mockReset()
    onSubmitTransition.mockReset()
  })

  afterEach(() => {
    cleanup()
  })

  it('renders workflow actions and triggers action selection', () => {
    render(
      <ClaimWorkflowCard
        fromStatus="IN_REVIEW"
        steps={[
          { id: 'DRAFT', label: 'Borrador', state: 'completed' },
          { id: 'IN_REVIEW', label: 'En revisión', state: 'current' },
        ]}
        actions={[
          {
            toStatus: 'SUBMITTED',
            label: 'Cambiar a Enviado',
            requiresReason: false,
          },
        ]}
        dialog={{
          open: false,
          reason: '',
          notes: '',
          isSubmitting: false,
        }}
        onActionSelect={onActionSelect}
        onDialogOpenChange={onDialogOpenChange}
        onReasonChange={onReasonChange}
        onNotesChange={onNotesChange}
        onSubmitTransition={onSubmitTransition}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Cambiar a Enviado' }))

    expect(onActionSelect).toHaveBeenCalledTimes(1)
    expect(onActionSelect).toHaveBeenCalledWith('SUBMITTED')
  })

  it('renders non-interactive message when no transitions are available', () => {
    render(
      <ClaimWorkflowCard
        fromStatus="SETTLED"
        steps={[
          { id: 'SETTLED', label: 'Liquidado', state: 'current' },
          { id: 'CANCELLED', label: 'Cancelado', state: 'terminal' },
        ]}
        actions={[]}
        dialog={{
          open: false,
          reason: '',
          notes: '',
          isSubmitting: false,
        }}
        onActionSelect={onActionSelect}
        onDialogOpenChange={onDialogOpenChange}
        onReasonChange={onReasonChange}
        onNotesChange={onNotesChange}
        onSubmitTransition={onSubmitTransition}
      />,
    )

    expect(
      screen.queryByText('No hay transiciones disponibles para este estado.'),
    ).not.toBeNull()
    expect(
      screen.queryAllByRole('button', { name: /Cambiar a/i }),
    ).toHaveLength(0)
  })

  it('renders transition dialog when an action is active', () => {
    render(
      <ClaimWorkflowCard
        fromStatus="IN_REVIEW"
        steps={[
          { id: 'DRAFT', label: 'Borrador', state: 'completed' },
          { id: 'IN_REVIEW', label: 'En revisión', state: 'current' },
        ]}
        actions={[
          {
            toStatus: 'RETURNED',
            label: 'Cambiar a Devuelto',
            requiresReason: true,
          },
        ]}
        dialog={{
          open: true,
          action: {
            toStatus: 'RETURNED',
            label: 'Cambiar a Devuelto',
            requiresReason: true,
          },
          reason: '',
          notes: '',
          isSubmitting: false,
        }}
        onActionSelect={onActionSelect}
        onDialogOpenChange={onDialogOpenChange}
        onReasonChange={onReasonChange}
        onNotesChange={onNotesChange}
        onSubmitTransition={onSubmitTransition}
      />,
    )

    expect(
      screen.queryByRole('heading', { name: 'Confirmar transición' }),
    ).not.toBeNull()
    expect(screen.queryByText('Devuelto')).not.toBeNull()
  })
})
