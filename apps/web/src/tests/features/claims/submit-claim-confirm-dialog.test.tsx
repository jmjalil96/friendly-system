// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { SubmitClaimConfirmDialog } from '@/features/claims/components/new/submit-claim-confirm-dialog'

describe('SubmitClaimConfirmDialog', () => {
  const onOpenChange = vi.fn()
  const onConfirm = vi.fn()

  beforeEach(() => {
    onOpenChange.mockReset()
    onConfirm.mockReset()
  })

  afterEach(() => {
    cleanup()
  })

  it('renders content when open is true', () => {
    render(
      <SubmitClaimConfirmDialog
        open
        onOpenChange={onOpenChange}
        onConfirm={onConfirm}
        isSubmitting={false}
        canSubmit
      />,
    )

    expect(screen.queryByText('Confirmar creación del reclamo')).not.toBeNull()
    expect(
      screen.queryByText(
        'Se creará el reclamo con la información cargada. ¿Deseas continuar?',
      ),
    ).not.toBeNull()
  })

  it('does not render dialog content when open is false', () => {
    render(
      <SubmitClaimConfirmDialog
        open={false}
        onOpenChange={onOpenChange}
        onConfirm={onConfirm}
        isSubmitting={false}
        canSubmit
      />,
    )

    expect(screen.queryByText('Confirmar creación del reclamo')).toBeNull()
  })

  it('calls onConfirm when clicking confirm action', () => {
    render(
      <SubmitClaimConfirmDialog
        open
        onOpenChange={onOpenChange}
        onConfirm={onConfirm}
        isSubmitting={false}
        canSubmit
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Confirmar y crear' }))

    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('disables actions and shows pending label while submitting', () => {
    render(
      <SubmitClaimConfirmDialog
        open
        onOpenChange={onOpenChange}
        onConfirm={onConfirm}
        isSubmitting
        canSubmit
      />,
    )

    const cancelButton = screen.getByRole('button', {
      name: 'Cancelar',
    }) as HTMLButtonElement
    const confirmButton = screen.getByRole('button', {
      name: 'Creando...',
    }) as HTMLButtonElement

    expect(cancelButton.disabled).toBe(true)
    expect(confirmButton.disabled).toBe(true)
  })
})
