// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { PolicyWorkflowCard } from '@/features/policies/detail/ui/workflow/policy-workflow-card'

describe('PolicyWorkflowCard', () => {
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
      <PolicyWorkflowCard
        fromStatus="ACTIVE"
        steps={[
          { id: 'PENDING', label: 'Pendiente', state: 'completed' },
          { id: 'ACTIVE', label: 'Activa', state: 'current' },
        ]}
        actions={[
          {
            toStatus: 'SUSPENDED',
            label: 'Cambiar a Suspendida',
            requiresReason: true,
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

    fireEvent.click(
      screen.getByRole('button', { name: 'Cambiar a Suspendida' }),
    )

    expect(onActionSelect).toHaveBeenCalledTimes(1)
    expect(onActionSelect).toHaveBeenCalledWith('SUSPENDED')
  })

  it('renders non-interactive message when no transitions are available', () => {
    render(
      <PolicyWorkflowCard
        fromStatus="CANCELLED"
        steps={[
          { id: 'ACTIVE', label: 'Activa', state: 'completed' },
          { id: 'CANCELLED', label: 'Cancelada', state: 'terminal' },
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
      <PolicyWorkflowCard
        fromStatus="ACTIVE"
        steps={[
          { id: 'PENDING', label: 'Pendiente', state: 'completed' },
          { id: 'ACTIVE', label: 'Activa', state: 'current' },
        ]}
        actions={[
          {
            toStatus: 'SUSPENDED',
            label: 'Cambiar a Suspendida',
            requiresReason: true,
          },
        ]}
        dialog={{
          open: true,
          action: {
            toStatus: 'SUSPENDED',
            label: 'Cambiar a Suspendida',
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
    expect(screen.queryByText('Suspendida')).not.toBeNull()
  })
})
