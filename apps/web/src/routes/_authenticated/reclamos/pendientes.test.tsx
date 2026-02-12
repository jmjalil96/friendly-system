// @vitest-environment jsdom
import type { ComponentType } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { ClaimsListSearch } from '@/features/claims/model/claims.search'
import { NON_TERMINAL_CLAIM_STATUSES } from '@/features/claims/model/claims.status'

const useClaimsListControllerMock = vi.hoisted(() => vi.fn())

vi.mock('@/features/claims/list/controller/use-claims-list-controller', () => ({
  useClaimsListController: useClaimsListControllerMock,
}))

vi.mock('@/features/claims/list/ui/claims-list-header', () => ({
  ClaimsListHeader: ({ onCreateClaim }: { onCreateClaim: () => void }) => (
    <button type="button" onClick={onCreateClaim}>
      mock-pendientes-header
    </button>
  ),
}))

vi.mock('@/features/claims/list/ui/claims-filter-bar', () => ({
  ClaimsFilterBar: ({
    search,
    showStatusFilter,
  }: {
    search: string
    showStatusFilter?: boolean
  }) => <div>mock-pendientes-filter:{search}:{String(showStatusFilter)}</div>,
}))

vi.mock('@/features/claims/list/ui/claims-list-table', () => ({
  ClaimsListTable: ({ isLoading }: { isLoading: boolean }) => (
    <div>mock-pendientes-table:{String(isLoading)}</div>
  ),
}))

import { Route } from '@/routes/_authenticated/reclamos/pendientes'

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

describe('reclamos pendientes route', () => {
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
        selectedStatuses: ['DRAFT'],
        onToggleStatus: vi.fn(),
        chips: [],
        onClearAll: vi.fn(),
        showStatusFilter: false,
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

  it('applies validated search defaults and strips incoming status params', () => {
    const validateSearch = Route.options.validateSearch as (
      search: Record<string, unknown>,
    ) => ClaimsListSearch

    const defaults = validateSearch({})

    expect(defaults).toEqual(DEFAULT_SEARCH)

    const normalized = validateSearch({
      status: ['SETTLED'],
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
    })
    expect(normalized.status).toBeUndefined()
    expect((normalized as ClaimsListSearch & { dateFrom?: string }).dateFrom).toBe(
      undefined,
    )
    expect((normalized as ClaimsListSearch & { dateTo?: string }).dateTo).toBe(
      undefined,
    )
  })

  it('orchestrates locked pending view and strips status from search updates', () => {
    const { container } = renderPage()

    expect(screen.queryByText('mock-pendientes-header')).not.toBeNull()
    expect(
      screen.queryByText('mock-pendientes-filter:dolor:false'),
    ).not.toBeNull()
    expect(screen.queryByText('mock-pendientes-table:false')).not.toBeNull()

    const stickyChrome = container.querySelector(
      '[data-slot="claims-list-top-chrome"]',
    )
    expect(stickyChrome).not.toBeNull()
    expect(stickyChrome?.className).toContain('lg:sticky')

    expect(useClaimsListControllerMock).toHaveBeenCalledTimes(1)

    const hookInput = useClaimsListControllerMock.mock.calls[0]?.[0] as {
      search: ClaimsListSearch
      updateSearch: (
        updater: (previous: ClaimsListSearch) => ClaimsListSearch,
        options?: { replace?: boolean },
      ) => void
      onCreateClaim: () => void
      lockedStatuses: readonly string[]
      showStatusFilter: boolean
    }

    expect(hookInput.search).toEqual(DEFAULT_SEARCH)
    expect(hookInput.lockedStatuses).toEqual(NON_TERMINAL_CLAIM_STATUSES)
    expect(hookInput.showStatusFilter).toBe(false)

    hookInput.onCreateClaim()
    expect(navigateMock).toHaveBeenCalledWith({ to: '/reclamos/nuevo' })

    hookInput.updateSearch(
      (previous) => ({
        ...previous,
        page: 2,
        search: 'hospital',
        status: ['SETTLED'],
      }),
      { replace: true },
    )

    const navigateCall = navigateMock.mock.calls[1]?.[0] as {
      search: (previous: ClaimsListSearch) => ClaimsListSearch
      replace: boolean
    }

    expect(navigateCall.replace).toBe(true)

    const nextSearch = navigateCall.search({
      ...DEFAULT_SEARCH,
      status: ['CANCELLED'],
    })

    expect(nextSearch).toEqual({
      ...DEFAULT_SEARCH,
      page: 2,
      search: 'hospital',
    })
    expect(nextSearch.status).toBeUndefined()

    fireEvent.click(
      screen.getByRole('button', { name: 'mock-pendientes-header' }),
    )
  })
})
