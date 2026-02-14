// @vitest-environment jsdom
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { PoliciesFilterBar } from '@/features/policies/list/ui/policies-filter-bar'

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
  DropdownMenuCheckboxItem: ({
    children,
    checked,
    onCheckedChange,
  }: {
    children: ReactNode
    checked?: boolean
    onCheckedChange?: (checked: boolean) => void
  }) => (
    <button
      type="button"
      aria-pressed={checked}
      onClick={() => onCheckedChange?.(!checked)}
    >
      {children}
    </button>
  ),
}))

describe('PoliciesFilterBar', () => {
  const onSearchChange = vi.fn()
  const onToggleStatus = vi.fn()
  const onClearAll = vi.fn()
  const onChipRemove = vi.fn()

  beforeEach(() => {
    onSearchChange.mockReset()
    onToggleStatus.mockReset()
    onClearAll.mockReset()
    onChipRemove.mockReset()
  })

  afterEach(() => {
    cleanup()
  })

  it('renders initial search value and selected status indicator', () => {
    const { container } = render(
      <PoliciesFilterBar
        search="POL-2026"
        onSearchChange={onSearchChange}
        selectedStatuses={['PENDING']}
        onToggleStatus={onToggleStatus}
        chips={[]}
        onClearAll={onClearAll}
      />,
    )

    const searchInput = screen.getByLabelText(
      'Buscar póliza',
    ) as HTMLInputElement
    expect(searchInput.value).toBe('POL-2026')
    expect(
      screen.queryByRole('button', { name: 'Estado: Pendiente' }),
    ).not.toBeNull()

    const row = container.querySelector('[data-slot="filter-bar-row"]')
    expect(row?.className).toContain('flex-wrap')
    expect(
      container.querySelector('[data-slot="filter-bar-actions"]'),
    ).toBeNull()
  })

  it('calls status toggle handler when selecting an option', () => {
    render(
      <PoliciesFilterBar
        search=""
        onSearchChange={onSearchChange}
        selectedStatuses={[]}
        onToggleStatus={onToggleStatus}
        chips={[]}
        onClearAll={onClearAll}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Pendiente' }))

    expect(onToggleStatus).toHaveBeenCalledTimes(1)
    expect(onToggleStatus).toHaveBeenCalledWith('PENDING')
  })

  it('renders chips and clear-all action', () => {
    const { container } = render(
      <PoliciesFilterBar
        search="POL"
        onSearchChange={onSearchChange}
        selectedStatuses={['ACTIVE']}
        onToggleStatus={onToggleStatus}
        chips={[
          {
            key: 'search',
            label: '"POL"',
            onRemove: onChipRemove,
          },
        ]}
        onClearAll={onClearAll}
      />,
    )

    const actions = container.querySelector('[data-slot="filter-bar-actions"]')
    expect(actions?.className).toContain('ml-auto')

    fireEvent.click(screen.getByLabelText('Remover filtro: "POL"'))
    expect(onChipRemove).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: 'Limpiar filtros' }))
    expect(onClearAll).toHaveBeenCalledTimes(1)
  })
})
