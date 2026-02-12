// @vitest-environment jsdom
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { ListClaimsItem } from '@friendly-system/shared'
import { ClaimsListTable } from '@/features/claims/list/ui/claims-list-table'

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

const BASE_ITEM: ListClaimsItem = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  claimNumber: 1001,
  status: 'SUBMITTED',
  clientId: '11111111-1111-1111-1111-111111111111',
  clientName: 'Seguros del Sur',
  affiliateId: '22222222-2222-2222-2222-222222222222',
  affiliateFirstName: 'Maria',
  affiliateLastName: 'Gonzalez',
  patientId: '33333333-3333-3333-3333-333333333333',
  patientFirstName: 'Maria',
  patientLastName: 'Gonzalez',
  description: 'Consulta odontologica general',
  createdAt: '2026-01-15T10:30:00Z',
  updatedAt: '2026-01-16T10:30:00Z',
}

describe('ClaimsListTable', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders rows and claim link target', () => {
    const { container } = render(
      <ClaimsListTable
        data={[BASE_ITEM]}
        isLoading={false}
        sorting={[{ id: 'createdAt', desc: true }]}
        onSortingChange={vi.fn()}
        pagination={{ pageIndex: 0, pageSize: 20 }}
        onPaginationChange={vi.fn()}
        paginationMeta={{ page: 1, limit: 20, totalCount: 1, totalPages: 1 }}
      />,
    )

    const claimLink = screen.getByRole('link', { name: '#1001' })
    expect(claimLink.getAttribute('href')).toBe('/reclamos/550e8400-e29b-41d4-a716-446655440000')
    expect(screen.queryByText('Enviado')).not.toBeNull()

    const tableContainer = container.querySelector('[data-slot="table-container"]')
    const table = container.querySelector('[data-slot="table"]')
    const stickyHeadCell = container.querySelector('[data-slot="table-head"]')

    expect(
      screen.queryByText('Desliza la tabla horizontalmente para ver todas las columnas.'),
    ).not.toBeNull()
    const hint = screen.queryByText(
      'Desliza la tabla horizontalmente para ver todas las columnas.',
    )
    expect(hint?.className).toContain('xl:hidden')
    expect(tableContainer?.className).toContain('overflow-auto')
    expect(tableContainer?.className).toContain('max-h-[72vh]')
    expect(tableContainer?.className).toContain('[scrollbar-width:none]')
    expect(table?.className).toContain('min-w-[720px]')
    expect(stickyHeadCell?.className).toContain('sticky')
  })

  it('renders loading skeleton rows while loading', () => {
    const { container } = render(
      <ClaimsListTable
        data={[]}
        isLoading
        sorting={[{ id: 'createdAt', desc: true }]}
        onSortingChange={vi.fn()}
        pagination={{ pageIndex: 0, pageSize: 20 }}
        onPaginationChange={vi.fn()}
        paginationMeta={{ page: 1, limit: 20, totalCount: 0, totalPages: 0 }}
      />,
    )

    expect(container.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0)
  })

  it('renders empty message when no rows are available', () => {
    const onClearFilters = vi.fn()

    render(
      <ClaimsListTable
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

    expect(screen.queryByText('No hay reclamos para mostrar')).not.toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Limpiar filtros' }))
    expect(onClearFilters).toHaveBeenCalledTimes(1)
  })

  it('renders localized status badges from shared status mapping', () => {
    render(
      <ClaimsListTable
        data={[
          { ...BASE_ITEM, status: 'DRAFT', id: 'a', claimNumber: 1002 },
          { ...BASE_ITEM, status: 'IN_REVIEW', id: 'b', claimNumber: 1003 },
        ]}
        isLoading={false}
        sorting={[{ id: 'createdAt', desc: true }]}
        onSortingChange={vi.fn()}
        pagination={{ pageIndex: 0, pageSize: 20 }}
        onPaginationChange={vi.fn()}
        paginationMeta={{ page: 1, limit: 20, totalCount: 2, totalPages: 1 }}
      />,
    )

    expect(screen.queryByText('Borrador')).not.toBeNull()
    expect(screen.queryByText('En revisión')).not.toBeNull()
  })

  it('forwards sortable header interactions to sorting handler', () => {
    const onSortingChange = vi.fn()

    render(
      <ClaimsListTable
        data={[BASE_ITEM]}
        isLoading={false}
        sorting={[{ id: 'createdAt', desc: true }]}
        onSortingChange={onSortingChange}
        pagination={{ pageIndex: 0, pageSize: 20 }}
        onPaginationChange={vi.fn()}
        paginationMeta={{ page: 1, limit: 20, totalCount: 1, totalPages: 1 }}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Nro' }))

    expect(onSortingChange).toHaveBeenCalledTimes(1)

    const updateArg = onSortingChange.mock.calls[0]?.[0] as
      | Array<{ id: string; desc: boolean }>
      | ((previous: Array<{ id: string; desc: boolean }>) => Array<{
        id: string
        desc: boolean
      }>)

    const nextSorting = typeof updateArg === 'function'
      ? updateArg([{ id: 'createdAt', desc: true }])
      : updateArg

    expect(nextSorting[0]).toEqual({ id: 'claimNumber', desc: false })
  })

  it('allows selecting a different page size from pagination controls', () => {
    const onPaginationChange = vi.fn()

    render(
      <ClaimsListTable
        data={[BASE_ITEM]}
        isLoading={false}
        sorting={[{ id: 'createdAt', desc: true }]}
        onSortingChange={vi.fn()}
        pagination={{ pageIndex: 0, pageSize: 20 }}
        onPaginationChange={onPaginationChange}
        paginationMeta={{ page: 1, limit: 20, totalCount: 1, totalPages: 1 }}
      />,
    )

    fireEvent.pointerDown(
      screen.getByRole('button', {
        name: 'Seleccionar cantidad de filas por página',
      }),
    )
    fireEvent.click(screen.getByRole('menuitemradio', { name: '50 por página' }))

    expect(onPaginationChange).toHaveBeenCalledTimes(1)

    const updateArg = onPaginationChange.mock.calls[0]?.[0] as
      | { pageIndex: number; pageSize: number }
      | ((previous: { pageIndex: number; pageSize: number }) => {
        pageIndex: number
        pageSize: number
      })

    const nextState = typeof updateArg === 'function'
      ? updateArg({ pageIndex: 0, pageSize: 20 })
      : updateArg

    expect(nextState.pageSize).toBe(50)
  })

  it('renders fetch error state and retries on action', () => {
    const onRetry = vi.fn()

    render(
      <ClaimsListTable
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

    expect(screen.queryByText('No pudimos cargar los reclamos')).not.toBeNull()
    expect(
      screen.queryByText('Ocurrió un error al obtener la lista. Intenta nuevamente.'),
    ).not.toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })
})
