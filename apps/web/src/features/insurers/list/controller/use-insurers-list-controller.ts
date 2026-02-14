import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  createInsurerSchema,
  type CreateInsurerInput,
  type ListInsurersQuery,
} from '@friendly-system/shared'
import {
  type OnChangeFn,
  type PaginationState,
  type SortingState,
} from '@tanstack/react-table'
import { useDebouncedValue } from '@/shared/hooks/use-debounced-value'
import {
  useCreateInsurer,
  useListInsurers,
} from '@/features/insurers/api/insurers.hooks'
import { INSURERS_SEARCH_DEBOUNCE_MS } from '@/features/insurers/model/insurers.constants'
import type { InsurersListSearch } from '@/features/insurers/model/insurers.search'
import type { InsurerCreateDialogProps } from '@/features/insurers/list/ui/insurer-create-dialog'
import type { InsurersFilterBarProps } from '@/features/insurers/list/ui/insurers-filter-bar'
import type { InsurersListHeaderProps } from '@/features/insurers/list/ui/insurers-list-header'
import type { InsurersListTableProps } from '@/features/insurers/list/ui/insurers-list-table'

const INSURER_SORT_FIELDS = ['createdAt', 'name', 'type', 'updatedAt'] as const

type InsurerSortField = (typeof INSURER_SORT_FIELDS)[number]

function isInsurerSortField(value: string): value is InsurerSortField {
  return INSURER_SORT_FIELDS.includes(value as InsurerSortField)
}

function resolveUpdater<T>(updater: T | ((previous: T) => T), previous: T): T {
  if (typeof updater === 'function') {
    return (updater as (previous: T) => T)(previous)
  }

  return updater
}

export interface InsurersListSearchUpdateOptions {
  replace?: boolean
}

export interface InsurersListSearchUpdater {
  (
    updater: (previous: InsurersListSearch) => InsurersListSearch,
    options?: InsurersListSearchUpdateOptions,
  ): void
}

export interface UseInsurersListControllerParams {
  search: InsurersListSearch
  updateSearch: InsurersListSearchUpdater
  onInsurerCreated: (id: string) => void
}

export interface UseInsurersListControllerResult {
  headerProps: InsurersListHeaderProps
  filterBarProps: InsurersFilterBarProps
  tableProps: InsurersListTableProps
  createDialogProps: InsurerCreateDialogProps
}

export function useInsurersListController({
  search,
  updateSearch,
  onInsurerCreated,
}: UseInsurersListControllerParams): UseInsurersListControllerResult {
  const [searchInput, setSearchInput] = useState(search.search ?? '')
  const skipDebouncedSearchSyncRef = useRef(true)
  const debouncedSearchInput = useDebouncedValue(
    searchInput,
    INSURERS_SEARCH_DEBOUNCE_MS,
  )

  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [createName, setCreateName] = useState('')
  const [createType, setCreateType] = useState<
    'MEDICINA_PREPAGADA' | 'COMPANIA_DE_SEGUROS'
  >('MEDICINA_PREPAGADA')
  const [createIsActive, setCreateIsActive] = useState(true)
  const [createError, setCreateError] = useState<string>()

  const { createInsurer, createInsurerStatus } = useCreateInsurer()

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

  const listQueryInput = useMemo(
    () =>
      ({
        page: search.page,
        limit: search.limit,
        sortBy: search.sortBy,
        sortOrder: search.sortOrder,
        ...(search.search ? { search: search.search } : {}),
        ...(search.isActive !== undefined ? { isActive: search.isActive } : {}),
      }) satisfies Partial<ListInsurersQuery>,
    [
      search.page,
      search.limit,
      search.sortBy,
      search.sortOrder,
      search.search,
      search.isActive,
    ],
  )

  const listQuery = useListInsurers(listQueryInput)

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

  const onIsActiveChange = useCallback(
    (value: boolean | undefined) => {
      updateSearch(
        (previous) => ({
          ...previous,
          isActive: value,
          page: 1,
        }),
        { replace: true },
      )
    },
    [updateSearch],
  )

  const onClearAll = useCallback(() => {
    setSearchInput('')
    updateSearch(
      (previous) => ({
        ...previous,
        search: undefined,
        isActive: undefined,
        page: 1,
      }),
      { replace: true },
    )
  }, [updateSearch])

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

      const nextSortBy = isInsurerSortField(primarySort.id)
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

  const chips = useMemo<InsurersFilterBarProps['chips']>(() => {
    const nextChips: InsurersFilterBarProps['chips'] = []

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

    if (search.isActive !== undefined) {
      nextChips.push({
        key: 'is-active',
        label: `Estado: ${search.isActive ? 'Activo' : 'Inactivo'}`,
        onRemove: () => onIsActiveChange(undefined),
      })
    }

    return nextChips
  }, [search.search, search.isActive, onIsActiveChange, updateSearch])

  const hasActiveFilters =
    Boolean(search.search) || search.isActive !== undefined

  const onOpenCreateDialog = useCallback(() => {
    setCreateDialogOpen(true)
    setCreateError(undefined)
  }, [])

  const onCloseCreateDialog = useCallback(
    (open: boolean) => {
      if (!open && createInsurerStatus === 'pending') return
      setCreateDialogOpen(open)
      if (!open) {
        setCreateName('')
        setCreateType('MEDICINA_PREPAGADA')
        setCreateIsActive(true)
        setCreateError(undefined)
      }
    },
    [createInsurerStatus],
  )

  const onSubmitCreate = useCallback(async () => {
    const parsed = createInsurerSchema.safeParse({
      name: createName,
      type: createType,
      isActive: createIsActive,
    } satisfies CreateInsurerInput)

    if (!parsed.success) {
      setCreateError(parsed.error.issues[0]?.message ?? 'Datos inválidos')
      return
    }

    try {
      setCreateError(undefined)
      const created = await createInsurer(parsed.data)
      setCreateDialogOpen(false)
      setCreateName('')
      setCreateType('MEDICINA_PREPAGADA')
      setCreateIsActive(true)
      onInsurerCreated(created.id)
    } catch {
      setCreateError('No pudimos crear la aseguradora. Intenta nuevamente.')
    }
  }, [createName, createType, createIsActive, createInsurer, onInsurerCreated])

  const headerProps = useMemo<InsurersListHeaderProps>(
    () => ({ onCreateInsurer: onOpenCreateDialog }),
    [onOpenCreateDialog],
  )

  const filterBarProps = useMemo<InsurersFilterBarProps>(
    () => ({
      search: searchInput,
      onSearchChange: setSearchInput,
      isActive: search.isActive,
      onIsActiveChange,
      chips,
      onClearAll,
    }),
    [searchInput, search.isActive, onIsActiveChange, chips, onClearAll],
  )

  const tableProps = useMemo<InsurersListTableProps>(
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

  const createDialogProps = useMemo<InsurerCreateDialogProps>(
    () => ({
      open: createDialogOpen,
      name: createName,
      type: createType,
      isActive: createIsActive,
      isSubmitting: createInsurerStatus === 'pending',
      error: createError,
      onOpenChange: onCloseCreateDialog,
      onNameChange: setCreateName,
      onTypeChange: setCreateType,
      onIsActiveChange: setCreateIsActive,
      onSubmit: onSubmitCreate,
    }),
    [
      createDialogOpen,
      createName,
      createType,
      createIsActive,
      createInsurerStatus,
      createError,
      onCloseCreateDialog,
      onSubmitCreate,
    ],
  )

  return {
    headerProps,
    filterBarProps,
    tableProps,
    createDialogProps,
  }
}
