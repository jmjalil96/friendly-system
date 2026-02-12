// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { ClaimDeleteDialog } from '@/features/claims/detail/ui/claim-delete-dialog'

describe('ClaimDeleteDialog', () => {
  const onOpenChange = vi.fn()
  const onConfirmDelete = vi.fn()

  beforeEach(() => {
    onOpenChange.mockReset()
    onConfirmDelete.mockReset()
  })

  afterEach(() => {
    cleanup()
  })

  it('renders delete warning with claim number context', () => {
    render(
      <ClaimDeleteDialog
        open
        claimNumber={512}
        isDeleting={false}
        onOpenChange={onOpenChange}
        onConfirmDelete={onConfirmDelete}
      />,
    )

    expect(screen.queryByRole('heading', { name: 'Eliminar reclamo' })).not.toBeNull()
    expect(screen.queryByText('#512')).not.toBeNull()
    expect(screen.queryByText(/no se puede deshacer/i)).not.toBeNull()
  })

  it('triggers confirm callback', () => {
    render(
      <ClaimDeleteDialog
        open
        claimNumber={512}
        isDeleting={false}
        onOpenChange={onOpenChange}
        onConfirmDelete={onConfirmDelete}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Eliminar reclamo' }))
    expect(onConfirmDelete).toHaveBeenCalledTimes(1)
  })

  it('disables controls while deleting', () => {
    render(
      <ClaimDeleteDialog
        open
        claimNumber={512}
        isDeleting
        onOpenChange={onOpenChange}
        onConfirmDelete={onConfirmDelete}
      />,
    )

    expect(
      (screen.getByRole('button', { name: 'Cancelar' }) as HTMLButtonElement).disabled,
    ).toBe(true)
    expect(
      (screen.getByRole('button', { name: 'Eliminando...' }) as HTMLButtonElement)
        .disabled,
    ).toBe(true)
  })
})
