// @vitest-environment jsdom
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { ClaimsFilterBar } from '@/features/claims/list/ui/claims-filter-bar'

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

describe('ClaimsFilterBar', () => {
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
      <ClaimsFilterBar
        search="hospital"
        onSearchChange={onSearchChange}
        selectedStatuses={['DRAFT']}
        onToggleStatus={onToggleStatus}
        chips={[]}
        onClearAll={onClearAll}
      />,
    )

    const searchInput = screen.getByLabelText(
      'Buscar reclamo',
    ) as HTMLInputElement
    expect(searchInput.value).toBe('hospital')
    expect(
      screen.queryByRole('button', { name: 'Estado: Borrador' }),
    ).not.toBeNull()

    const row = container.querySelector('[data-slot="filter-bar-row"]')

    expect(row?.className).toContain('flex-wrap')
    expect(
      container.querySelector('[data-slot="filter-bar-actions"]'),
    ).toBeNull()
  })

  it('calls status toggle handler when selecting an option', () => {
    render(
      <ClaimsFilterBar
        search=""
        onSearchChange={onSearchChange}
        selectedStatuses={[]}
        onToggleStatus={onToggleStatus}
        chips={[]}
        onClearAll={onClearAll}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Borrador' }))

    expect(onToggleStatus).toHaveBeenCalledTimes(1)
    expect(onToggleStatus).toHaveBeenCalledWith('DRAFT')
  })

  it('renders chips and forwards chip remove action', () => {
    render(
      <ClaimsFilterBar
        search=""
        onSearchChange={onSearchChange}
        selectedStatuses={[]}
        onToggleStatus={onToggleStatus}
        chips={[
          {
            key: 'status-DRAFT',
            label: 'Estado: Borrador',
            onRemove: onChipRemove,
          },
        ]}
        onClearAll={onClearAll}
      />,
    )

    fireEvent.click(screen.getByLabelText('Remover filtro: Estado: Borrador'))

    expect(onChipRemove).toHaveBeenCalledTimes(1)
  })

  it('calls clear-all action when button is pressed', () => {
    const { container } = render(
      <ClaimsFilterBar
        search="dolor"
        onSearchChange={onSearchChange}
        selectedStatuses={['IN_REVIEW']}
        onToggleStatus={onToggleStatus}
        chips={[
          {
            key: 'search',
            label: '"dolor"',
            onRemove: onChipRemove,
          },
        ]}
        onClearAll={onClearAll}
      />,
    )

    const actions = container.querySelector('[data-slot="filter-bar-actions"]')
    expect(actions?.className).toContain('w-auto')
    expect(actions?.className).toContain('ml-auto')

    fireEvent.click(screen.getByRole('button', { name: 'Limpiar filtros' }))

    expect(onClearAll).toHaveBeenCalledTimes(1)
  })

  it('hides status filter control when showStatusFilter is false', () => {
    render(
      <ClaimsFilterBar
        search="hospital"
        onSearchChange={onSearchChange}
        selectedStatuses={['DRAFT']}
        onToggleStatus={onToggleStatus}
        chips={[]}
        onClearAll={onClearAll}
        showStatusFilter={false}
      />,
    )

    expect(screen.queryByLabelText('Buscar reclamo')).not.toBeNull()
    expect(
      screen.queryByRole('button', { name: 'Estado: Borrador' }),
    ).toBeNull()
    expect(screen.queryByRole('button', { name: 'Estado' })).toBeNull()
  })

  it('keeps search input in sync with controlled search prop', () => {
    const { rerender } = render(
      <ClaimsFilterBar
        search="hospital"
        onSearchChange={onSearchChange}
        selectedStatuses={[]}
        onToggleStatus={onToggleStatus}
        chips={[]}
        onClearAll={onClearAll}
      />,
    )

    expect(
      (screen.getByLabelText('Buscar reclamo') as HTMLInputElement).value,
    ).toBe('hospital')

    rerender(
      <ClaimsFilterBar
        search=""
        onSearchChange={onSearchChange}
        selectedStatuses={[]}
        onToggleStatus={onToggleStatus}
        chips={[]}
        onClearAll={onClearAll}
      />,
    )

    expect(
      (screen.getByLabelText('Buscar reclamo') as HTMLInputElement).value,
    ).toBe('')
  })
})
