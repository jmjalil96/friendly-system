// @vitest-environment jsdom
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'

vi.mock('@/shared/ui/primitives/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  DropdownMenuTrigger: ({ children }: { children: ReactNode }) => (
    <>{children}</>
  ),
  DropdownMenuContent: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  DropdownMenuItem: ({
    children,
    onSelect,
    disabled,
  }: {
    children: ReactNode
    onSelect?: (event: { preventDefault: () => void }) => void
    disabled?: boolean
  }) => (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onSelect?.({ preventDefault: () => undefined })}
    >
      {children}
    </button>
  ),
}))

import { ClaimDetailHeaderActions } from '@/features/claims/detail/ui/claim-detail-header-actions'

describe('ClaimDetailHeaderActions', () => {
  const onDeleteRequest = vi.fn()

  beforeEach(() => {
    onDeleteRequest.mockReset()
  })

  afterEach(() => {
    cleanup()
  })

  it('triggers delete callback from primary action button', () => {
    render(
      <ClaimDetailHeaderActions
        disabled={false}
        isDeleting={false}
        onDeleteRequest={onDeleteRequest}
      />,
    )

    fireEvent.click(screen.getByLabelText('Eliminar reclamo'))
    expect(onDeleteRequest).toHaveBeenCalledTimes(1)
  })

  it('triggers delete callback from dropdown action item', () => {
    render(
      <ClaimDetailHeaderActions
        disabled={false}
        isDeleting={false}
        onDeleteRequest={onDeleteRequest}
      />,
    )

    const deleteActions = screen.getAllByRole('button', {
      name: 'Eliminar reclamo',
    })
    fireEvent.click(deleteActions[1]!)

    expect(onDeleteRequest).toHaveBeenCalledTimes(1)
  })

  it('disables split button controls while deleting', () => {
    render(
      <ClaimDetailHeaderActions
        disabled={false}
        isDeleting
        onDeleteRequest={onDeleteRequest}
      />,
    )

    expect(
      (screen.getByLabelText('Eliminar reclamo') as HTMLButtonElement).disabled,
    ).toBe(true)
    expect(
      (screen.getByLabelText('Abrir opciones de reclamo') as HTMLButtonElement)
        .disabled,
    ).toBe(true)
    expect(
      (
        screen.getAllByRole('button', {
          name: 'Eliminar reclamo',
        })[1] as HTMLButtonElement
      ).disabled,
    ).toBe(true)
  })
})
