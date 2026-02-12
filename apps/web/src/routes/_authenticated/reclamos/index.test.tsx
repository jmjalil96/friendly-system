// @vitest-environment jsdom
import type { ComponentType } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { ClaimsListSearch } from '@/features/claims/model/claims.search'

const useClaimsListControllerMock = vi.hoisted(() => vi.fn())

vi.mock('@/features/claims/list/controller/use-claims-list-controller', () => ({
  useClaimsListController: useClaimsListControllerMock,
}))

vi.mock('@/features/claims/list/ui/claims-list-header', () => ({
  ClaimsListHeader: ({ onCreateClaim }: { onCreateClaim: () => void }) => (
    <button type="button" onClick={onCreateClaim}>
      mock-list-header
    </button>
  ),
}))

vi.mock('@/features/claims/list/ui/claims-filter-bar', () => ({
  ClaimsFilterBar: ({ search }: { search: string }) => (
    <div>mock-list-filter:{search}</div>
  ),
}))

vi.mock('@/features/claims/list/ui/claims-list-table', () => ({
  ClaimsListTable: ({ isLoading }: { isLoading: boolean }) => (
    <div>mock-list-table:{String(isLoading)}</div>
  ),
}))

import { Route } from '@/routes/_authenticated/reclamos/index'

const DEFAULT_SEARCH: ClaimsListSearch = {
  sortBy: 'createdAt',
  sortOrder: 'desc',
  page: 1,
  limit: 20,
}

function renderPage() {
  const Component = Route.options.component as ComponentType
  return render(<Component />)
}

describe('reclamos index route', () => {
  const navigateMock = vi.fn()

  beforeEach(() => {
    navigateMock.mockReset()
    navigateMock.mockResolvedValue(undefined)

    useClaimsListControllerMock.mockReset()
    useClaimsListControllerMock.mockReturnValue({
      headerProps: {
        onCreateClaim: vi.fn(),
      },
      filterBarProps: {
        search: 'dolor',
        onSearchChange: vi.fn(),
        selectedStatuses: [],
        onToggleStatus: vi.fn(),
        chips: [],
        onClearAll: vi.fn(),
      },
      tableProps: {
        data: [],
        isLoading: false,
        sorting: [{ id: 'createdAt', desc: true }],
        onSortingChange: vi.fn(),
        pagination: { pageIndex: 0, pageSize: 20 },
        onPaginationChange: vi.fn(),
        paginationMeta: { page: 1, limit: 20, totalCount: 0, totalPages: 0 },
      },
    })

    vi.spyOn(Route, 'useSearch').mockReturnValue(DEFAULT_SEARCH)
    vi.spyOn(Route, 'useNavigate').mockReturnValue(navigateMock)
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('applies validated search defaults from shared schema', () => {
    const validateSearch = Route.options.validateSearch as (
      search: Record<string, unknown>,
    ) => ClaimsListSearch

    const defaults = validateSearch({})

    expect(defaults).toEqual(DEFAULT_SEARCH)

    const normalized = validateSearch({
      status: 'DRAFT',
      page: '2',
      limit: '50',
      sortBy: 'claimNumber',
      sortOrder: 'asc',
      dateFrom: '2026-01-01',
      dateTo: '2026-01-31',
    })

    expect(normalized).toEqual({
      sortBy: 'claimNumber',
      sortOrder: 'asc',
      page: 2,
      limit: 50,
      status: ['DRAFT'],
    })
    expect((normalized as ClaimsListSearch & { dateFrom?: string }).dateFrom).toBe(
      undefined,
    )
    expect((normalized as ClaimsListSearch & { dateTo?: string }).dateTo).toBe(
      undefined,
    )

    const fallback = validateSearch({ page: 0 })

    expect(fallback).toEqual(DEFAULT_SEARCH)

    const partialFallback = validateSearch({
      search: 'dolor',
      status: 'DRAFT',
      sortBy: 'claimNumber',
      page: 0,
    })

    expect(partialFallback).toEqual({
      sortBy: 'claimNumber',
      sortOrder: 'desc',
      page: 1,
      limit: 20,
      search: 'dolor',
      status: ['DRAFT'],
    })
  })

  it('orchestrates list wrappers and delegates navigation actions', () => {
    const { container } = renderPage()

    expect(screen.queryByText('mock-list-header')).not.toBeNull()
    expect(screen.queryByText('mock-list-filter:dolor')).not.toBeNull()
    expect(screen.queryByText('mock-list-table:false')).not.toBeNull()

    const stickyChrome = container.querySelector(
      '[data-slot="claims-list-top-chrome"]',
    )
    expect(stickyChrome).not.toBeNull()
    expect(stickyChrome?.className).toContain('lg:sticky')
    expect(stickyChrome?.textContent).toContain('mock-list-header')
    expect(stickyChrome?.textContent).toContain('mock-list-filter:dolor')

    expect(useClaimsListControllerMock).toHaveBeenCalledTimes(1)

    const hookInput = useClaimsListControllerMock.mock.calls[0]?.[0] as {
      search: ClaimsListSearch
      updateSearch: (
        updater: (previous: ClaimsListSearch) => ClaimsListSearch,
        options?: { replace?: boolean },
      ) => void
      onCreateClaim: () => void
    }

    expect(hookInput.search).toEqual(DEFAULT_SEARCH)
    expect(typeof hookInput.updateSearch).toBe('function')
    expect(typeof hookInput.onCreateClaim).toBe('function')

    hookInput.onCreateClaim()
    expect(navigateMock).toHaveBeenCalledWith({ to: '/reclamos/nuevo' })

    hookInput.updateSearch((previous) => ({ ...previous, page: 2 }), {
      replace: true,
    })

    expect(navigateMock).toHaveBeenCalledWith({
      search: expect.any(Function),
      replace: true,
    })

    fireEvent.click(screen.getByRole('button', { name: 'mock-list-header' }))
  })
})
