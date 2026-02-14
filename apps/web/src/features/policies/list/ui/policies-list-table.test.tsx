// @vitest-environment jsdom
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { ListPoliciesItem } from '@friendly-system/shared'
import { PoliciesListTable } from '@/features/policies/list/ui/policies-list-table'

vi.mock('@tanstack/react-router', async () => {
  const actual = await vi.importActual<typeof import('@tanstack/react-router')>(
    '@tanstack/react-router',
  )

  return {
    ...actual,
    Link: ({
      to,
      params,
      children,
      ...props
    }: {
      to: string
      params?: { id?: string }
      children: ReactNode
    } & Record<string, unknown>) => {
      const href = params?.id ? to.replace('$id', params.id) : to
      return (
        <a href={href} {...props}>
          {children}
        </a>
      )
    },
  }
})

const BASE_ITEM: ListPoliciesItem = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  policyNumber: 'POL-1001',
  status: 'ACTIVE',
  clientId: '11111111-1111-1111-1111-111111111111',
  clientName: 'Seguros del Sur',
  insurerId: '22222222-2222-2222-2222-222222222222',
  insurerName: 'Aseguradora Uno',
  type: 'HEALTH',
  planName: null,
  employeeClass: null,
  maxCoverage: null,
  deductible: null,
  startDate: '2026-01-01',
  endDate: '2026-12-31',
  createdAt: '2026-01-15T10:30:00Z',
  updatedAt: '2026-01-16T10:30:00Z',
}

describe('PoliciesListTable', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders rows and policy link target', () => {
    const { container } = render(
      <PoliciesListTable
        data={[BASE_ITEM]}
        isLoading={false}
        sorting={[{ id: 'createdAt', desc: true }]}
        onSortingChange={vi.fn()}
        pagination={{ pageIndex: 0, pageSize: 20 }}
        onPaginationChange={vi.fn()}
        paginationMeta={{ page: 1, limit: 20, totalCount: 1, totalPages: 1 }}
      />,
    )

    const policyLink = screen.getByRole('link', { name: 'POL-1001' })
    expect(policyLink.getAttribute('href')).toBe(
      '/polizas/550e8400-e29b-41d4-a716-446655440000',
    )
    expect(screen.queryByText('Activa')).not.toBeNull()

    const tableContainer = container.querySelector(
      '[data-slot="table-container"]',
    )
    const table = container.querySelector('[data-slot="table"]')
    const stickyHeadCell = container.querySelector('[data-slot="table-head"]')

    expect(
      screen.queryByText(
        'Desliza la tabla horizontalmente para ver todas las columnas.',
      ),
    ).not.toBeNull()
    expect(tableContainer?.className).toContain('overflow-auto')
    expect(tableContainer?.className).toContain('max-h-[72vh]')
    expect(table?.className).toContain('min-w-[720px]')
    expect(stickyHeadCell?.className).toContain('sticky')
  })

  it('renders empty state when no rows are available', () => {
    const onClearFilters = vi.fn()

    render(
      <PoliciesListTable
        data={[]}
        isLoading={false}
        hasActiveFilters
        onClearFilters={onClearFilters}
        sorting={[{ id: 'createdAt', desc: true }]}
        onSortingChange={vi.fn()}
        pagination={{ pageIndex: 0, pageSize: 20 }}
        onPaginationChange={vi.fn()}
      />,
    )

    expect(screen.queryByText('No hay pólizas para mostrar')).not.toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Limpiar filtros' }))
    expect(onClearFilters).toHaveBeenCalledTimes(1)
  })

  it('renders fetch error state and retries on action', () => {
    const onRetry = vi.fn()

    render(
      <PoliciesListTable
        data={[]}
        isLoading={false}
        isError
        onRetry={onRetry}
        sorting={[{ id: 'createdAt', desc: true }]}
        onSortingChange={vi.fn()}
        pagination={{ pageIndex: 0, pageSize: 20 }}
        onPaginationChange={vi.fn()}
      />,
    )

    expect(screen.queryByText('No pudimos cargar las pólizas')).not.toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })
})
