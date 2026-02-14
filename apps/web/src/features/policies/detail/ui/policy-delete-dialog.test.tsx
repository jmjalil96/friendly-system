// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { PolicyDeleteDialog } from '@/features/policies/detail/ui/policy-delete-dialog'

describe('PolicyDeleteDialog', () => {
  const onOpenChange = vi.fn()
  const onConfirmDelete = vi.fn()

  beforeEach(() => {
    onOpenChange.mockReset()
    onConfirmDelete.mockReset()
  })

  afterEach(() => {
    cleanup()
  })

  it('renders delete warning with policy number context', () => {
    render(
      <PolicyDeleteDialog
        open
        policyNumber="POL-512"
        isDeleting={false}
        onOpenChange={onOpenChange}
        onConfirmDelete={onConfirmDelete}
      />,
    )

    expect(
      screen.queryByRole('heading', { name: 'Eliminar póliza' }),
    ).not.toBeNull()
    expect(screen.queryByText('POL-512')).not.toBeNull()
    expect(screen.queryByText(/no se puede deshacer/i)).not.toBeNull()
  })

  it('triggers confirm callback', () => {
    render(
      <PolicyDeleteDialog
        open
        policyNumber="POL-512"
        isDeleting={false}
        onOpenChange={onOpenChange}
        onConfirmDelete={onConfirmDelete}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Eliminar póliza' }))
    expect(onConfirmDelete).toHaveBeenCalledTimes(1)
  })

  it('disables controls while deleting', () => {
    render(
      <PolicyDeleteDialog
        open
        policyNumber="POL-512"
        isDeleting
        onOpenChange={onOpenChange}
        onConfirmDelete={onConfirmDelete}
      />,
    )

    expect(
      (screen.getByRole('button', { name: 'Cancelar' }) as HTMLButtonElement)
        .disabled,
    ).toBe(true)
    expect(
      (
        screen.getByRole('button', {
          name: 'Eliminando...',
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true)
  })
})
