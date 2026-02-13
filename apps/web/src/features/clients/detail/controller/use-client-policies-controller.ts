import { useCallback, useEffect, useMemo, useState } from 'react'
import { type OnChangeFn, type PaginationState } from '@tanstack/react-table'
import type { ClientPoliciesResponse } from '@friendly-system/shared'
import { useDebouncedValue } from '@/shared/hooks/use-debounced-value'
import { useClientPolicies } from '@/features/clients/api/clients.hooks'
import { CLIENTS_SEARCH_DEBOUNCE_MS } from '@/features/clients/model/clients.constants'

const DEFAULT_PAGE = 1
const DEFAULT_LIMIT = 20

type ClientPolicyItem = ClientPoliciesResponse['data'][number]

function resolveUpdater<T>(updater: T | ((previous: T) => T), previous: T): T {
  if (typeof updater === 'function') {
    return (updater as (previous: T) => T)(previous)
  }

  return updater
}

export interface UseClientPoliciesControllerParams {
  clientId: string
}

export interface UseClientPoliciesControllerResult {
  items: ClientPolicyItem[]
  isLoading: boolean
  isError: boolean
  searchInput: string
  onSearchInputChange: (value: string) => void
  pagination: PaginationState
  paginationMeta?: ClientPoliciesResponse['meta']
  onPaginationChange: OnChangeFn<PaginationState>
  onRetry: () => void
}

export function useClientPoliciesController({
  clientId,
}: UseClientPoliciesControllerParams): UseClientPoliciesControllerResult {
  const [page, setPage] = useState(DEFAULT_PAGE)
  const [limit, setLimit] = useState(DEFAULT_LIMIT)
  const [searchInput, setSearchInput] = useState('')

  const debouncedSearch = useDebouncedValue(
    searchInput,
    CLIENTS_SEARCH_DEBOUNCE_MS,
  )

  const query = useClientPolicies(clientId, {
    page,
    limit,
    ...(debouncedSearch.trim() ? { search: debouncedSearch.trim() } : {}),
  })

  useEffect(() => {
    setPage(DEFAULT_PAGE)
    setLimit(DEFAULT_LIMIT)
    setSearchInput('')
  }, [clientId])

  const onPaginationChange = useCallback<OnChangeFn<PaginationState>>(
    (updater) => {
      const current = { pageIndex: page - 1, pageSize: limit }
      const next = resolveUpdater(updater, current)

      if (next.pageSize !== limit) {
        setLimit(next.pageSize)
        setPage(1)
        return
      }

      setPage(Math.max(1, next.pageIndex + 1))
    },
    [page, limit],
  )

  const onSearchInputChange = useCallback((value: string) => {
    setSearchInput(value)
    setPage(1)
  }, [])

  const onRetry = useCallback(() => {
    void query.refetch()
  }, [query.refetch])

  const pagination = useMemo<PaginationState>(
    () => ({ pageIndex: Math.max(0, page - 1), pageSize: limit }),
    [page, limit],
  )

  return {
    items: query.data?.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    searchInput,
    onSearchInputChange,
    pagination,
    paginationMeta: query.data?.meta,
    onPaginationChange,
    onRetry,
  }
}
