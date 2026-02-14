// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { PolicyTransitionDialog } from '@/features/policies/detail/ui/workflow/policy-transition-dialog'

describe('PolicyTransitionDialog', () => {
  const onOpenChange = vi.fn()
  const onReasonChange = vi.fn()
  const onNotesChange = vi.fn()
  const onSubmit = vi.fn()

  beforeEach(() => {
    onOpenChange.mockReset()
    onReasonChange.mockReset()
    onNotesChange.mockReset()
    onSubmit.mockReset()
  })

  afterEach(() => {
    cleanup()
  })

  it('renders transition context and required reason state', () => {
    render(
      <PolicyTransitionDialog
        open
        onOpenChange={onOpenChange}
        fromStatusLabel="Activa"
        toStatusLabel="Suspendida"
        reasonRequired
        reason=""
        notes=""
        isSubmitting={false}
        onReasonChange={onReasonChange}
        onNotesChange={onNotesChange}
        onSubmit={onSubmit}
      />,
    )

    expect(
      screen.queryByRole('heading', { name: 'Confirmar transición' }),
    ).not.toBeNull()
    expect(screen.queryByText('Activa')).not.toBeNull()
    expect(screen.queryByText('Suspendida')).not.toBeNull()
    expect(screen.queryByText('Motivo (requerido)')).not.toBeNull()
  })

  it('calls callbacks for input changes and submit', () => {
    render(
      <PolicyTransitionDialog
        open
        onOpenChange={onOpenChange}
        fromStatusLabel="Activa"
        toStatusLabel="Suspendida"
        reasonRequired={false}
        reason=""
        notes=""
        isSubmitting={false}
        onReasonChange={onReasonChange}
        onNotesChange={onNotesChange}
        onSubmit={onSubmit}
      />,
    )

    fireEvent.change(screen.getByLabelText('Motivo (opcional)'), {
      target: { value: 'Falta documentación' },
    })
    fireEvent.change(screen.getByLabelText('Notas (opcional)'), {
      target: { value: 'Se necesita respaldo adicional.' },
    })
    fireEvent.click(
      screen.getByRole('button', { name: 'Confirmar transición' }),
    )

    expect(onReasonChange).toHaveBeenCalledTimes(1)
    expect(onNotesChange).toHaveBeenCalledTimes(1)
    expect(onSubmit).toHaveBeenCalledTimes(1)
  })

  it('disables controls while submitting', () => {
    render(
      <PolicyTransitionDialog
        open
        onOpenChange={onOpenChange}
        fromStatusLabel="Activa"
        toStatusLabel="Suspendida"
        reasonRequired={false}
        reason=""
        notes=""
        isSubmitting
        onReasonChange={onReasonChange}
        onNotesChange={onNotesChange}
        onSubmit={onSubmit}
      />,
    )

    expect(
      (screen.getByRole('button', { name: 'Cancelar' }) as HTMLButtonElement)
        .disabled,
    ).toBe(true)
    expect(
      (
        screen.getByRole('button', {
          name: 'Actualizando...',
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true)
  })
})
