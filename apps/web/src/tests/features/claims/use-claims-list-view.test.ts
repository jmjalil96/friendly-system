// @vitest-environment jsdom
import { createElement, type ReactElement } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, render } from '@testing-library/react'
import type { ClaimStatus } from '@friendly-system/shared'
import type { ClaimsListSearch } from '@/features/claims/claims-list-search'
import {
  useClaimsListView,
  type UseClaimsListViewResult,
} from '@/features/claims/hooks/use-claims-list-view'

const useListClaimsMock = vi.hoisted(() => vi.fn())

vi.mock('@/features/claims/hooks/use-claims', () => ({
  useListClaims: useListClaimsMock,
}))

const DEFAULT_SEARCH: ClaimsListSearch = {
  sortBy: 'createdAt',
  sortOrder: 'desc',
  page: 1,
  limit: 20,
}

const DEFAULT_META = {
  page: 1,
  limit: 20,
  totalCount: 0,
  totalPages: 0,
}

function makeSearch(overrides: Partial<ClaimsListSearch> = {}): ClaimsListSearch {
  return {
    ...DEFAULT_SEARCH,
    ...overrides,
  }
}

describe('useClaimsListView', () => {
  let latest: UseClaimsListViewResult | null = null

  const updateSearchMock = vi.fn()
  const onCreateClaimMock = vi.fn()

  function Harness({
    search,
    lockedStatuses,
    showStatusFilter,
  }: {
    search: ClaimsListSearch
    lockedStatuses?: readonly ClaimStatus[]
    showStatusFilter?: boolean
  }): ReactElement {
    latest = useClaimsListView({
      search,
      updateSearch: updateSearchMock,
      onCreateClaim: onCreateClaimMock,
      lockedStatuses,
      showStatusFilter,
    })

    return createElement('div')
  }

  beforeEach(() => {
    latest = null
    vi.useFakeTimers()
    updateSearchMock.mockReset()
    onCreateClaimMock.mockReset()
    useListClaimsMock.mockReset()
    useListClaimsMock.mockReturnValue({
      data: {
        data: [],
        meta: DEFAULT_META,
      },
      isLoading: false,
    })
  })

  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })

  it('maps URL search params into list query input', () => {
    render(
      createElement(Harness, {
        search: makeSearch({
          search: 'dolor lumbar',
          status: ['DRAFT', 'SUBMITTED'],
          sortBy: 'claimNumber',
          sortOrder: 'asc',
          page: 3,
          limit: 50,
        }),
      }),
    )

    expect(useListClaimsMock).toHaveBeenCalledTimes(1)
    expect(useListClaimsMock).toHaveBeenCalledWith({
      search: 'dolor lumbar',
      status: ['DRAFT', 'SUBMITTED'],
      sortBy: 'claimNumber',
      sortOrder: 'asc',
      page: 3,
      limit: 50,
    })
  })

  it('debounces search updates and resets page using replace navigation', async () => {
    render(createElement(Harness, { search: makeSearch({ page: 4 }) }))

    act(() => {
      latest?.filterBarProps.onSearchChange('hospital')
    })

    await act(async () => {
      vi.advanceTimersByTime(300)
      await Promise.resolve()
    })

    expect(updateSearchMock).toHaveBeenCalledTimes(1)
    expect(updateSearchMock.mock.calls[0]?.[1]).toEqual({ replace: true })

    const updater = updateSearchMock.mock.calls[0]?.[0] as (
      previous: ClaimsListSearch,
    ) => ClaimsListSearch

    expect(
      updater(
        makeSearch({
          page: 4,
        }),
      ),
    ).toEqual(
      makeSearch({
        page: 1,
        search: 'hospital',
      }),
    )
  })

  it('toggles status filters and clears status when last value is removed', () => {
    const { rerender } = render(createElement(Harness, { search: makeSearch() }))

    act(() => {
      latest?.filterBarProps.onToggleStatus('DRAFT')
    })

    const addUpdater = updateSearchMock.mock.calls[0]?.[0] as (
      previous: ClaimsListSearch,
    ) => ClaimsListSearch

    expect(addUpdater(makeSearch())).toEqual(
      makeSearch({
        status: ['DRAFT'],
        page: 1,
      }),
    )

    updateSearchMock.mockReset()

    rerender(createElement(Harness, { search: makeSearch({ status: ['DRAFT'] }) }))

    act(() => {
      latest?.filterBarProps.onToggleStatus('DRAFT')
    })

    const removeUpdater = updateSearchMock.mock.calls[0]?.[0] as (
      previous: ClaimsListSearch,
    ) => ClaimsListSearch

    expect(removeUpdater(makeSearch({ status: ['DRAFT'] }))).toEqual(
      makeSearch({
        status: undefined,
        page: 1,
      }),
    )
  })

  it('maps sorting and pagination changes back into URL params', () => {
    render(createElement(Harness, { search: makeSearch() }))

    act(() => {
      latest?.tableProps.onSortingChange([{ id: 'claimNumber', desc: false }])
    })

    const sortingUpdater = updateSearchMock.mock.calls[0]?.[0] as (
      previous: ClaimsListSearch,
    ) => ClaimsListSearch

    expect(updateSearchMock.mock.calls[0]?.[1]).toEqual({ replace: true })
    expect(sortingUpdater(makeSearch({ page: 8 }))).toEqual(
      makeSearch({
        sortBy: 'claimNumber',
        sortOrder: 'asc',
        page: 1,
      }),
    )

    updateSearchMock.mockReset()

    act(() => {
      latest?.tableProps.onPaginationChange({ pageIndex: 2, pageSize: 20 })
    })

    const paginationUpdater = updateSearchMock.mock.calls[0]?.[0] as (
      previous: ClaimsListSearch,
    ) => ClaimsListSearch

    expect(paginationUpdater(makeSearch())).toEqual(
      makeSearch({
        page: 3,
        limit: 20,
      }),
    )

    updateSearchMock.mockReset()

    act(() => {
      latest?.tableProps.onPaginationChange({ pageIndex: 2, pageSize: 50 })
    })

    const pageSizeUpdater = updateSearchMock.mock.calls[0]?.[0] as (
      previous: ClaimsListSearch,
    ) => ClaimsListSearch

    expect(pageSizeUpdater(makeSearch({ page: 4 }))).toEqual(
      makeSearch({
        page: 1,
        limit: 50,
      }),
    )
  })

  it('clears all filters and preserves shared defaults', () => {
    render(
      createElement(Harness, {
        search: makeSearch({
          search: 'x-ray',
          status: ['IN_REVIEW'],
          page: 6,
        }),
      }),
    )

    act(() => {
      latest?.filterBarProps.onClearAll()
    })

    const updater = updateSearchMock.mock.calls[0]?.[0] as (
      previous: ClaimsListSearch,
    ) => ClaimsListSearch

    expect(
      updater(makeSearch({ search: 'x-ray', status: ['IN_REVIEW'], page: 6 })),
    ).toEqual(
      makeSearch({
        search: undefined,
        status: undefined,
        page: 1,
      }),
    )
  })

  it('uses locked statuses as authoritative query filter and keeps status UI disabled', () => {
    render(
      createElement(Harness, {
        search: makeSearch({
          search: 'dolor',
          status: ['SETTLED'],
        }),
        lockedStatuses: ['DRAFT', 'IN_REVIEW'],
        showStatusFilter: false,
      }),
    )

    expect(useListClaimsMock).toHaveBeenCalledWith({
      search: 'dolor',
      status: ['DRAFT', 'IN_REVIEW'],
      sortBy: 'createdAt',
      sortOrder: 'desc',
      page: 1,
      limit: 20,
    })

    expect(latest?.filterBarProps.showStatusFilter).toBe(false)

    act(() => {
      latest?.filterBarProps.onToggleStatus('CANCELLED')
    })

    expect(updateSearchMock).toHaveBeenCalledTimes(0)
  })

  it('clears only editable filters in locked mode and omits status chips', () => {
    render(
      createElement(Harness, {
        search: makeSearch({
          search: 'rx',
          status: ['DRAFT'],
          page: 4,
        }),
        lockedStatuses: ['DRAFT', 'IN_REVIEW'],
        showStatusFilter: false,
      }),
    )

    expect(latest?.filterBarProps.chips).toEqual([
      expect.objectContaining({
        key: 'search',
        label: '"rx"',
      }),
    ])

    act(() => {
      latest?.filterBarProps.onClearAll()
    })

    expect(updateSearchMock).toHaveBeenCalledTimes(1)
    expect(updateSearchMock.mock.calls[0]?.[1]).toEqual({ replace: true })

    const updater = updateSearchMock.mock.calls[0]?.[0] as (
      previous: ClaimsListSearch,
    ) => ClaimsListSearch

    expect(
      updater(makeSearch({ search: 'rx', status: ['DRAFT'], page: 4 })),
    ).toEqual(
      makeSearch({
        search: undefined,
        status: ['DRAFT'],
        page: 1,
      }),
    )
  })

  it('does not restore stale debounced search after clear-all sync', async () => {
    const { rerender } = render(
      createElement(Harness, {
        search: makeSearch({
          search: 'hospital',
          page: 2,
        }),
      }),
    )

    act(() => {
      latest?.filterBarProps.onClearAll()
    })

    expect(updateSearchMock).toHaveBeenCalledTimes(1)

    updateSearchMock.mockReset()

    // Simulate router search sync after clear-all.
    rerender(
      createElement(Harness, {
        search: makeSearch({
          search: undefined,
          page: 1,
        }),
      }),
    )

    await act(async () => {
      vi.advanceTimersByTime(300)
      await Promise.resolve()
    })

    // No re-apply of stale "hospital" search should happen.
    expect(updateSearchMock).toHaveBeenCalledTimes(0)
  })
})
