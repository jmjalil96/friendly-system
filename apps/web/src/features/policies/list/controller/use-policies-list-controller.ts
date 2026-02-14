import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  createPolicySchema,
  type CreatePolicyInput,
  type ListPoliciesQuery,
  type PolicyStatus,
} from '@friendly-system/shared'
import type {
  OnChangeFn,
  PaginationState,
  SortingState,
} from '@tanstack/react-table'
import { useDebouncedValue } from '@/shared/hooks/use-debounced-value'
import {
  useCreatePolicy,
  useListPolicies,
  useLookupPolicyClients,
  useLookupPolicyInsurers,
} from '@/features/policies/api/policies.hooks'
import { POLICIES_SEARCH_DEBOUNCE_MS } from '@/features/policies/model/policies.constants'
import { POLICY_STATUS_LABELS } from '@/features/policies/model/policies.status'
import type { PoliciesListSearch } from '@/features/policies/model/policies.search'
import type { PolicyCreateDialogProps } from '@/features/policies/list/ui/policy-create-dialog'
import type { PoliciesFilterBarProps } from '@/features/policies/list/ui/policies-filter-bar'
import type { PoliciesListHeaderProps } from '@/features/policies/list/ui/policies-list-header'
import type { PoliciesListTableProps } from '@/features/policies/list/ui/policies-list-table'

const POLICY_SORT_FIELDS = ['createdAt', 'policyNumber', 'updatedAt'] as const

type PolicySortField = (typeof POLICY_SORT_FIELDS)[number]

function isPolicySortField(value: string): value is PolicySortField {
  return POLICY_SORT_FIELDS.includes(value as PolicySortField)
}

function resolveUpdater<T>(updater: T | ((previous: T) => T), previous: T): T {
  if (typeof updater === 'function') {
    return (updater as (previous: T) => T)(previous)
  }
  return updater
}

function normalizeOptionalText(value: string): string | undefined {
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

function normalizeOptionalDecimal(value: string): string | undefined {
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed.replace(/,/g, '.') : undefined
}

export interface PoliciesListSearchUpdateOptions {
  replace?: boolean
}

export interface PoliciesListSearchUpdater {
  (
    updater: (previous: PoliciesListSearch) => PoliciesListSearch,
    options?: PoliciesListSearchUpdateOptions,
  ): void
}

export interface UsePoliciesListControllerParams {
  search: PoliciesListSearch
  updateSearch: PoliciesListSearchUpdater
  onPolicyCreated: (id: string) => void
}

export interface UsePoliciesListControllerResult {
  headerProps: PoliciesListHeaderProps
  filterBarProps: PoliciesFilterBarProps
  tableProps: PoliciesListTableProps
  createDialogProps: PolicyCreateDialogProps
}

export function usePoliciesListController({
  search,
  updateSearch,
  onPolicyCreated,
}: UsePoliciesListControllerParams): UsePoliciesListControllerResult {
  const [searchInput, setSearchInput] = useState(search.search ?? '')
  const skipDebouncedSearchSyncRef = useRef(true)
  const debouncedSearchInput = useDebouncedValue(
    searchInput,
    POLICIES_SEARCH_DEBOUNCE_MS,
  )

  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [createPolicyNumber, setCreatePolicyNumber] = useState('')
  const [createClientId, setCreateClientId] = useState('')
  const [createInsurerId, setCreateInsurerId] = useState('')
  const [createType, setCreateType] = useState<
    CreatePolicyInput['type'] | undefined
  >(undefined)
  const [createPlanName, setCreatePlanName] = useState('')
  const [createEmployeeClass, setCreateEmployeeClass] = useState('')
  const [createMaxCoverage, setCreateMaxCoverage] = useState('')
  const [createDeductible, setCreateDeductible] = useState('')
  const [createStartDate, setCreateStartDate] = useState('')
  const [createEndDate, setCreateEndDate] = useState('')
  const [createClientSearch, setCreateClientSearch] = useState('')
  const [createInsurerSearch, setCreateInsurerSearch] = useState('')
  const [createError, setCreateError] = useState<string>()

  const debouncedClientSearch = useDebouncedValue(
    createClientSearch,
    POLICIES_SEARCH_DEBOUNCE_MS,
  )
  const debouncedInsurerSearch = useDebouncedValue(
    createInsurerSearch,
    POLICIES_SEARCH_DEBOUNCE_MS,
  )

  const { createPolicy, createPolicyStatus } = useCreatePolicy()

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

  const selectedStatuses = useMemo<PolicyStatus[]>(
    () => [...(search.status ?? [])],
    [search.status],
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
      }) satisfies Partial<ListPoliciesQuery>,
    [
      search.page,
      search.limit,
      search.sortBy,
      search.sortOrder,
      search.search,
      selectedStatuses,
    ],
  )

  const listQuery = useListPolicies(listQueryInput)

  const clientsLookupQuery = useLookupPolicyClients(
    debouncedClientSearch.trim().length > 0
      ? { page: 1, limit: 20, search: debouncedClientSearch }
      : { page: 1, limit: 50 },
  )

  const insurersLookupQuery = useLookupPolicyInsurers(
    debouncedInsurerSearch.trim().length > 0
      ? { page: 1, limit: 20, search: debouncedInsurerSearch }
      : { page: 1, limit: 50 },
  )

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
    (status: PolicyStatus) => {
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
    [updateSearch],
  )

  const onClearAll = useCallback(() => {
    setSearchInput('')
    updateSearch(
      (previous) => ({
        ...previous,
        search: undefined,
        status: undefined,
        page: 1,
      }),
      { replace: true },
    )
  }, [updateSearch])

  const hasActiveFilters = Boolean(search.search) || selectedStatuses.length > 0

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

      const nextSortBy = isPolicySortField(primarySort.id)
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

  const chips = useMemo<PoliciesFilterBarProps['chips']>(() => {
    const nextChips: PoliciesFilterBarProps['chips'] = []

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

    for (const status of selectedStatuses) {
      nextChips.push({
        key: `status-${status}`,
        label: `Estado: ${POLICY_STATUS_LABELS[status]}`,
        onRemove: () => onToggleStatus(status),
      })
    }

    return nextChips
  }, [search.search, selectedStatuses, onToggleStatus, updateSearch])

  const onOpenCreateDialog = useCallback(() => {
    setCreateDialogOpen(true)
    setCreateError(undefined)
  }, [])

  const resetCreateDialogState = useCallback(() => {
    setCreatePolicyNumber('')
    setCreateClientId('')
    setCreateInsurerId('')
    setCreateType(undefined)
    setCreatePlanName('')
    setCreateEmployeeClass('')
    setCreateMaxCoverage('')
    setCreateDeductible('')
    setCreateStartDate('')
    setCreateEndDate('')
    setCreateClientSearch('')
    setCreateInsurerSearch('')
    setCreateError(undefined)
  }, [])

  const onCloseCreateDialog = useCallback(
    (open: boolean) => {
      if (!open && createPolicyStatus === 'pending') return
      setCreateDialogOpen(open)
      if (!open) resetCreateDialogState()
    },
    [createPolicyStatus, resetCreateDialogState],
  )

  const onSubmitCreate = useCallback(async () => {
    const parsed = createPolicySchema.safeParse({
      policyNumber: createPolicyNumber,
      clientId: createClientId,
      insurerId: createInsurerId,
      type: createType,
      planName: normalizeOptionalText(createPlanName),
      employeeClass: normalizeOptionalText(createEmployeeClass),
      maxCoverage: normalizeOptionalDecimal(createMaxCoverage),
      deductible: normalizeOptionalDecimal(createDeductible),
      startDate: createStartDate,
      endDate: createEndDate,
    } satisfies CreatePolicyInput)

    if (!parsed.success) {
      setCreateError(parsed.error.issues[0]?.message ?? 'Datos inválidos')
      return
    }

    try {
      setCreateError(undefined)
      const created = await createPolicy(parsed.data)
      setCreateDialogOpen(false)
      resetCreateDialogState()
      onPolicyCreated(created.id)
    } catch {
      setCreateError('No pudimos crear la póliza. Intenta nuevamente.')
    }
  }, [
    createClientId,
    createEndDate,
    createInsurerId,
    createPlanName,
    createEmployeeClass,
    createMaxCoverage,
    createDeductible,
    createPolicy,
    createPolicyNumber,
    createStartDate,
    createType,
    onPolicyCreated,
    resetCreateDialogState,
  ])

  const headerProps = useMemo<PoliciesListHeaderProps>(
    () => ({ onCreatePolicy: onOpenCreateDialog }),
    [onOpenCreateDialog],
  )

  const filterBarProps = useMemo<PoliciesFilterBarProps>(
    () => ({
      search: searchInput,
      onSearchChange: setSearchInput,
      selectedStatuses,
      onToggleStatus,
      chips,
      onClearAll,
    }),
    [searchInput, selectedStatuses, onToggleStatus, chips, onClearAll],
  )

  const tableProps = useMemo<PoliciesListTableProps>(
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

  const createDialogProps = useMemo<PolicyCreateDialogProps>(
    () => ({
      open: createDialogOpen,
      policyNumber: createPolicyNumber,
      clientId: createClientId,
      insurerId: createInsurerId,
      type: createType,
      planName: createPlanName,
      employeeClass: createEmployeeClass,
      maxCoverage: createMaxCoverage,
      deductible: createDeductible,
      startDate: createStartDate,
      endDate: createEndDate,
      clientSearch: createClientSearch,
      insurerSearch: createInsurerSearch,
      clients: clientsLookupQuery.data?.data ?? [],
      insurers: insurersLookupQuery.data?.data ?? [],
      clientsLoading: clientsLookupQuery.isFetching,
      insurersLoading: insurersLookupQuery.isFetching,
      isSubmitting: createPolicyStatus === 'pending',
      error: createError,
      onOpenChange: onCloseCreateDialog,
      onPolicyNumberChange: setCreatePolicyNumber,
      onClientChange: setCreateClientId,
      onInsurerChange: setCreateInsurerId,
      onTypeChange: setCreateType,
      onPlanNameChange: setCreatePlanName,
      onEmployeeClassChange: setCreateEmployeeClass,
      onMaxCoverageChange: setCreateMaxCoverage,
      onDeductibleChange: setCreateDeductible,
      onStartDateChange: setCreateStartDate,
      onEndDateChange: setCreateEndDate,
      onClientSearchChange: setCreateClientSearch,
      onInsurerSearchChange: setCreateInsurerSearch,
      onSubmit: onSubmitCreate,
    }),
    [
      createDialogOpen,
      createPolicyNumber,
      createClientId,
      createInsurerId,
      createType,
      createPlanName,
      createEmployeeClass,
      createMaxCoverage,
      createDeductible,
      createStartDate,
      createEndDate,
      createClientSearch,
      createInsurerSearch,
      clientsLookupQuery.data?.data,
      insurersLookupQuery.data?.data,
      clientsLookupQuery.isFetching,
      insurersLookupQuery.isFetching,
      createPolicyStatus,
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
