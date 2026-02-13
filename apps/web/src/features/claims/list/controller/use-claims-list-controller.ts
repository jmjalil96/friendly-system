import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ClaimStatus, ListClaimsQuery } from '@friendly-system/shared'
import type {
  OnChangeFn,
  PaginationState,
  SortingState,
} from '@tanstack/react-table'
import { useDebouncedValue } from '@/shared/hooks/use-debounced-value'
import { CLAIM_STATUS_LABELS } from '@/features/claims/model/claims.status'
import { CLAIMS_SEARCH_DEBOUNCE_MS } from '@/features/claims/model/claims.constants'
import type { ClaimsFilterBarProps } from '@/features/claims/list/ui/claims-filter-bar'
import type { ClaimsListHeaderProps } from '@/features/claims/list/ui/claims-list-header'
import type { ClaimsListTableProps } from '@/features/claims/list/ui/claims-list-table'
import type { ClaimsListSearch } from '@/features/claims/model/claims.search'
import { useListClaims } from '@/features/claims/api/claims.hooks'

const CLAIM_SORT_FIELDS = ['createdAt', 'claimNumber', 'updatedAt'] as const

type ClaimSortField = (typeof CLAIM_SORT_FIELDS)[number]

function isClaimSortField(value: string): value is ClaimSortField {
  return CLAIM_SORT_FIELDS.includes(value as ClaimSortField)
}

function resolveUpdater<T>(updater: T | ((previous: T) => T), previous: T): T {
  if (typeof updater === 'function') {
    return (updater as (previous: T) => T)(previous)
  }

  return updater
}

export interface ClaimsListSearchUpdateOptions {
  replace?: boolean
}

export interface ClaimsListSearchUpdater {
  (
    updater: (previous: ClaimsListSearch) => ClaimsListSearch,
    options?: ClaimsListSearchUpdateOptions,
  ): void
}

export interface UseClaimsListControllerParams {
  search: ClaimsListSearch
  updateSearch: ClaimsListSearchUpdater
  onCreateClaim: () => void
  lockedStatuses?: readonly ClaimStatus[]
  showStatusFilter?: boolean
}

export interface UseClaimsListControllerResult {
  headerProps: ClaimsListHeaderProps
  filterBarProps: ClaimsFilterBarProps
  tableProps: ClaimsListTableProps
}

export function useClaimsListController({
  search,
  updateSearch,
  onCreateClaim,
  lockedStatuses,
  showStatusFilter = true,
}: UseClaimsListControllerParams): UseClaimsListControllerResult {
  const isStatusLocked = Boolean(lockedStatuses && lockedStatuses.length > 0)
  const [searchInput, setSearchInput] = useState(search.search ?? '')
  const skipDebouncedSearchSyncRef = useRef(true)
  const debouncedSearchInput = useDebouncedValue(
    searchInput,
    CLAIMS_SEARCH_DEBOUNCE_MS,
  )

  useEffect(() => {
    skipDebouncedSearchSyncRef.current = true
    setSearchInput(search.search ?? '')
  }, [search.search])

  useEffect(() => {
    if (skipDebouncedSearchSyncRef.current) {
      if (debouncedSearchInput !== searchInput) return
      skipDebouncedSearchSyncRef.current = false
      return
    }

    // Ignore stale debounced values while input is being externally synced
    // (e.g. clear filters updates URL search to undefined).
    if (debouncedSearchInput !== searchInput) return

    const normalizedSearch = debouncedSearchInput.trim()
    const currentSearch = search.search ?? ''

    if (normalizedSearch === currentSearch) return

    updateSearch(
      (previous) => ({
        ...previous,
        search: normalizedSearch || undefined,
        page: 1,
      }),
      { replace: true },
    )
  }, [debouncedSearchInput, searchInput, search.search, updateSearch])

  const selectedStatuses = useMemo<ClaimStatus[]>(
    () =>
      isStatusLocked ? [...(lockedStatuses ?? [])] : [...(search.status ?? [])],
    [isStatusLocked, lockedStatuses, search.status],
  )

  const listQueryInput = useMemo(
    () =>
      ({
        page: search.page,
        limit: search.limit,
        sortBy: search.sortBy,
        sortOrder: search.sortOrder,
        ...(search.search ? { search: search.search } : {}),
        ...(selectedStatuses.length > 0 ? { status: selectedStatuses } : {}),
      }) satisfies Partial<ListClaimsQuery>,
    [
      search.page,
      search.limit,
      search.sortBy,
      search.sortOrder,
      search.search,
      selectedStatuses,
    ],
  )

  const listQuery = useListClaims(listQueryInput)

  const sorting = useMemo<SortingState>(
    () => [{ id: search.sortBy, desc: search.sortOrder === 'desc' }],
    [search.sortBy, search.sortOrder],
  )

  const pagination = useMemo<PaginationState>(
    () => ({
      pageIndex: Math.max(0, search.page - 1),
      pageSize: search.limit,
    }),
    [search.page, search.limit],
  )

  const onToggleStatus = useCallback(
    (status: ClaimStatus) => {
      if (isStatusLocked) return

      updateSearch(
        (previous) => {
          const previousStatuses = previous.status ?? []
          const nextStatuses = previousStatuses.includes(status)
            ? previousStatuses.filter((value) => value !== status)
            : [...previousStatuses, status]

          return {
            ...previous,
            status: nextStatuses.length > 0 ? nextStatuses : undefined,
            page: 1,
          }
        },
        { replace: true },
      )
    },
    [isStatusLocked, updateSearch],
  )

  const onClearAll = useCallback(() => {
    setSearchInput('')
    updateSearch(
      (previous) =>
        isStatusLocked
          ? {
              ...previous,
              search: undefined,
              page: 1,
            }
          : {
              ...previous,
              search: undefined,
              status: undefined,
              page: 1,
            },
      { replace: true },
    )
  }, [isStatusLocked, updateSearch])

  const hasActiveFilters = isStatusLocked
    ? Boolean(search.search)
    : Boolean(search.search) || selectedStatuses.length > 0

  const onRetry = useCallback(() => {
    void listQuery.refetch()
  }, [listQuery.refetch])

  const onSortingChange = useCallback<OnChangeFn<SortingState>>(
    (updater) => {
      const currentSorting: SortingState = [
        { id: search.sortBy, desc: search.sortOrder === 'desc' },
      ]

      const nextSorting = resolveUpdater(updater, currentSorting)
      const primarySort = nextSorting[0]

      if (!primarySort) {
        updateSearch(
          (previous) => ({
            ...previous,
            sortBy: 'createdAt',
            sortOrder: 'desc',
            page: 1,
          }),
          { replace: true },
        )
        return
      }

      const nextSortBy = isClaimSortField(primarySort.id)
        ? primarySort.id
        : 'createdAt'
      const nextSortOrder: 'asc' | 'desc' = primarySort.desc ? 'desc' : 'asc'

      updateSearch(
        (previous) => ({
          ...previous,
          sortBy: nextSortBy,
          sortOrder: nextSortOrder,
          page: 1,
        }),
        { replace: true },
      )
    },
    [search.sortBy, search.sortOrder, updateSearch],
  )

  const onPaginationChange = useCallback<OnChangeFn<PaginationState>>(
    (updater) => {
      const currentPagination: PaginationState = {
        pageIndex: Math.max(0, search.page - 1),
        pageSize: search.limit,
      }

      const nextPagination = resolveUpdater(updater, currentPagination)

      updateSearch(
        (previous) => {
          const pageSizeChanged = nextPagination.pageSize !== previous.limit

          return {
            ...previous,
            limit: nextPagination.pageSize,
            page: pageSizeChanged
              ? 1
              : Math.max(0, nextPagination.pageIndex) + 1,
          }
        },
        { replace: false },
      )
    },
    [search.page, search.limit, updateSearch],
  )

  const chips = useMemo<ClaimsFilterBarProps['chips']>(() => {
    const nextChips: ClaimsFilterBarProps['chips'] = []

    if (search.search) {
      nextChips.push({
        key: 'search',
        label: `"${search.search}"`,
        onRemove: () => {
          setSearchInput('')
          updateSearch(
            (previous) => ({
              ...previous,
              search: undefined,
              page: 1,
            }),
            { replace: true },
          )
        },
      })
    }

    if (!isStatusLocked) {
      for (const status of selectedStatuses) {
        nextChips.push({
          key: `status-${status}`,
          label: `Estado: ${CLAIM_STATUS_LABELS[status]}`,
          onRemove: () => onToggleStatus(status),
        })
      }
    }

    return nextChips
  }, [
    search.search,
    selectedStatuses,
    onToggleStatus,
    updateSearch,
    isStatusLocked,
  ])

  const headerProps = useMemo<ClaimsListHeaderProps>(
    () => ({ onCreateClaim }),
    [onCreateClaim],
  )

  const filterBarProps = useMemo<ClaimsFilterBarProps>(
    () => ({
      search: searchInput,
      onSearchChange: setSearchInput,
      selectedStatuses,
      onToggleStatus,
      chips,
      onClearAll,
      showStatusFilter,
    }),
    [
      searchInput,
      selectedStatuses,
      onToggleStatus,
      chips,
      onClearAll,
      showStatusFilter,
    ],
  )

  const tableProps = useMemo<ClaimsListTableProps>(
    () => ({
      data: listQuery.data?.data ?? [],
      isLoading: listQuery.isLoading,
      isError: listQuery.isError,
      sorting,
      onSortingChange,
      pagination,
      onPaginationChange,
      paginationMeta: listQuery.data?.meta,
      hasActiveFilters,
      onClearFilters: onClearAll,
      onRetry,
    }),
    [
      listQuery.data?.data,
      listQuery.data?.meta,
      listQuery.isError,
      listQuery.isLoading,
      sorting,
      onSortingChange,
      pagination,
      onPaginationChange,
      hasActiveFilters,
      onClearAll,
      onRetry,
    ],
  )

  return {
    headerProps,
    filterBarProps,
    tableProps,
  }
}
