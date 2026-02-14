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

import { PolicyDetailHeaderActions } from '@/features/policies/detail/ui/policy-detail-header-actions'

describe('PolicyDetailHeaderActions', () => {
  const onDeleteRequest = vi.fn()

  beforeEach(() => {
    onDeleteRequest.mockReset()
  })

  afterEach(() => {
    cleanup()
  })

  it('triggers delete callback from primary action button', () => {
    render(
      <PolicyDetailHeaderActions
        disabled={false}
        isDeleting={false}
        onDeleteRequest={onDeleteRequest}
      />,
    )

    fireEvent.click(screen.getByLabelText('Eliminar póliza'))
    expect(onDeleteRequest).toHaveBeenCalledTimes(1)
  })

  it('triggers delete callback from dropdown action item', () => {
    render(
      <PolicyDetailHeaderActions
        disabled={false}
        isDeleting={false}
        onDeleteRequest={onDeleteRequest}
      />,
    )

    const deleteActions = screen.getAllByRole('button', {
      name: 'Eliminar póliza',
    })
    fireEvent.click(deleteActions[1]!)

    expect(onDeleteRequest).toHaveBeenCalledTimes(1)
  })

  it('disables split button controls while deleting', () => {
    render(
      <PolicyDetailHeaderActions
        disabled={false}
        isDeleting
        onDeleteRequest={onDeleteRequest}
      />,
    )

    expect(
      (screen.getByLabelText('Eliminar póliza') as HTMLButtonElement).disabled,
    ).toBe(true)
    expect(
      (screen.getByLabelText('Abrir opciones de póliza') as HTMLButtonElement)
        .disabled,
    ).toBe(true)
    expect(
      (
        screen.getAllByRole('button', {
          name: 'Eliminar póliza',
        })[1] as HTMLButtonElement
      ).disabled,
    ).toBe(true)
  })
})
