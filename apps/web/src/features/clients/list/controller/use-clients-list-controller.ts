import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  createClientSchema,
  type CreateClientInput,
  type ListClientsQuery,
} from '@friendly-system/shared'
import {
  type OnChangeFn,
  type PaginationState,
  type SortingState,
} from '@tanstack/react-table'
import { useDebouncedValue } from '@/shared/hooks/use-debounced-value'
import {
  useCreateClient,
  useListClients,
} from '@/features/clients/api/clients.hooks'
import { CLIENTS_SEARCH_DEBOUNCE_MS } from '@/features/clients/model/clients.constants'
import type { ClientsListSearch } from '@/features/clients/model/clients.search'
import type { ClientCreateDialogProps } from '@/features/clients/list/ui/client-create-dialog'
import type { ClientsFilterBarProps } from '@/features/clients/list/ui/clients-filter-bar'
import type { ClientsListHeaderProps } from '@/features/clients/list/ui/clients-list-header'
import type { ClientsListTableProps } from '@/features/clients/list/ui/clients-list-table'

const CLIENT_SORT_FIELDS = ['createdAt', 'name', 'updatedAt'] as const

type ClientSortField = (typeof CLIENT_SORT_FIELDS)[number]

function isClientSortField(value: string): value is ClientSortField {
  return CLIENT_SORT_FIELDS.includes(value as ClientSortField)
}

function resolveUpdater<T>(updater: T | ((previous: T) => T), previous: T): T {
  if (typeof updater === 'function') {
    return (updater as (previous: T) => T)(previous)
  }

  return updater
}

export interface ClientsListSearchUpdateOptions {
  replace?: boolean
}

export interface ClientsListSearchUpdater {
  (
    updater: (previous: ClientsListSearch) => ClientsListSearch,
    options?: ClientsListSearchUpdateOptions,
  ): void
}

export interface UseClientsListControllerParams {
  search: ClientsListSearch
  updateSearch: ClientsListSearchUpdater
  onClientCreated: (id: string) => void
}

export interface UseClientsListControllerResult {
  headerProps: ClientsListHeaderProps
  filterBarProps: ClientsFilterBarProps
  tableProps: ClientsListTableProps
  createDialogProps: ClientCreateDialogProps
}

export function useClientsListController({
  search,
  updateSearch,
  onClientCreated,
}: UseClientsListControllerParams): UseClientsListControllerResult {
  const [searchInput, setSearchInput] = useState(search.search ?? '')
  const skipDebouncedSearchSyncRef = useRef(true)
  const debouncedSearchInput = useDebouncedValue(
    searchInput,
    CLIENTS_SEARCH_DEBOUNCE_MS,
  )

  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [createName, setCreateName] = useState('')
  const [createIsActive, setCreateIsActive] = useState(true)
  const [createError, setCreateError] = useState<string>()

  const { createClient, createClientStatus } = useCreateClient()

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
      }) satisfies Partial<ListClientsQuery>,
    [
      search.page,
      search.limit,
      search.sortBy,
      search.sortOrder,
      search.search,
      search.isActive,
    ],
  )

  const listQuery = useListClients(listQueryInput)

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

      const nextSortBy = isClientSortField(primarySort.id)
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

  const chips = useMemo<ClientsFilterBarProps['chips']>(() => {
    const nextChips: ClientsFilterBarProps['chips'] = []

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
      if (!open && createClientStatus === 'pending') return
      setCreateDialogOpen(open)
      if (!open) {
        setCreateName('')
        setCreateIsActive(true)
        setCreateError(undefined)
      }
    },
    [createClientStatus],
  )

  const onSubmitCreate = useCallback(async () => {
    const parsed = createClientSchema.safeParse({
      name: createName,
      isActive: createIsActive,
    } satisfies CreateClientInput)

    if (!parsed.success) {
      setCreateError(parsed.error.issues[0]?.message ?? 'Datos inválidos')
      return
    }

    try {
      setCreateError(undefined)
      const created = await createClient(parsed.data)
      setCreateDialogOpen(false)
      setCreateName('')
      setCreateIsActive(true)
      onClientCreated(created.id)
    } catch {
      setCreateError('No pudimos crear el cliente. Intenta nuevamente.')
    }
  }, [createName, createIsActive, createClient, onClientCreated])

  const headerProps = useMemo<ClientsListHeaderProps>(
    () => ({ onCreateClient: onOpenCreateDialog }),
    [onOpenCreateDialog],
  )

  const filterBarProps = useMemo<ClientsFilterBarProps>(
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

  const tableProps = useMemo<ClientsListTableProps>(
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

  const createDialogProps = useMemo<ClientCreateDialogProps>(
    () => ({
      open: createDialogOpen,
      name: createName,
      isActive: createIsActive,
      isSubmitting: createClientStatus === 'pending',
      error: createError,
      onOpenChange: onCloseCreateDialog,
      onNameChange: setCreateName,
      onIsActiveChange: setCreateIsActive,
      onSubmit: onSubmitCreate,
    }),
    [
      createDialogOpen,
      createName,
      createIsActive,
      createClientStatus,
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
