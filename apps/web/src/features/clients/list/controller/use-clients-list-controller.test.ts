// @vitest-environment jsdom
import { createElement, type ReactElement } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, render } from '@testing-library/react'
import type { ClientsListSearch } from '@/features/clients/model/clients.search'
import {
  type UseClientsListControllerResult,
  useClientsListController,
} from '@/features/clients/list/controller/use-clients-list-controller'

const useListClientsMock = vi.hoisted(() => vi.fn())
const useCreateClientMock = vi.hoisted(() => vi.fn())

vi.mock('@/features/clients/api/clients.hooks', () => ({
  useListClients: useListClientsMock,
  useCreateClient: useCreateClientMock,
}))

const DEFAULT_SEARCH: ClientsListSearch = {
  sortBy: 'createdAt',
  sortOrder: 'desc',
  page: 1,
  limit: 20,
}

function makeSearch(
  overrides: Partial<ClientsListSearch> = {},
): ClientsListSearch {
  return {
    ...DEFAULT_SEARCH,
    ...overrides,
  }
}

describe('useClientsListController', () => {
  let latest: UseClientsListControllerResult | null = null
  const updateSearchMock = vi.fn()
  const onClientCreatedMock = vi.fn()
  const createClientMock = vi.fn()

  function Harness({ search }: { search: ClientsListSearch }): ReactElement {
    latest = useClientsListController({
      search,
      updateSearch: updateSearchMock,
      onClientCreated: onClientCreatedMock,
    })

    return createElement('div')
  }

  beforeEach(() => {
    latest = null
    vi.useFakeTimers()
    updateSearchMock.mockReset()
    onClientCreatedMock.mockReset()
    createClientMock.mockReset()

    useListClientsMock.mockReset()
    useListClientsMock.mockReturnValue({
      data: {
        data: [],
        meta: { page: 1, limit: 20, totalCount: 0, totalPages: 0 },
      },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    })

    useCreateClientMock.mockReset()
    useCreateClientMock.mockReturnValue({
      createClient: createClientMock,
      createClientStatus: 'idle',
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
          search: 'empresa',
          isActive: false,
          sortBy: 'name',
          sortOrder: 'asc',
          page: 3,
          limit: 50,
        }),
      }),
    )

    expect(useListClientsMock).toHaveBeenCalledWith({
      search: 'empresa',
      isActive: false,
      sortBy: 'name',
      sortOrder: 'asc',
      page: 3,
      limit: 50,
    })
  })

  it('debounces search updates and resets page with replace navigation', async () => {
    render(createElement(Harness, { search: makeSearch({ page: 4 }) }))

    act(() => {
      latest?.filterBarProps.onSearchChange('salud')
    })

    await act(async () => {
      vi.advanceTimersByTime(300)
      await Promise.resolve()
    })

    expect(updateSearchMock).toHaveBeenCalledTimes(1)
    expect(updateSearchMock.mock.calls[0]?.[1]).toEqual({ replace: true })

    const updater = updateSearchMock.mock.calls[0]?.[0] as (
      previous: ClientsListSearch,
    ) => ClientsListSearch

    expect(updater(makeSearch({ page: 4 }))).toEqual(
      makeSearch({ page: 1, search: 'salud' }),
    )
  })

  it('maps isActive filter, sorting, and pagination changes back into URL params', () => {
    render(createElement(Harness, { search: makeSearch() }))

    act(() => {
      latest?.filterBarProps.onIsActiveChange(true)
    })

    const activeUpdater = updateSearchMock.mock.calls[0]?.[0] as (
      previous: ClientsListSearch,
    ) => ClientsListSearch

    expect(activeUpdater(makeSearch({ page: 4 }))).toEqual(
      makeSearch({ isActive: true, page: 1 }),
    )

    updateSearchMock.mockReset()

    act(() => {
      latest?.tableProps.onSortingChange([{ id: 'name', desc: false }])
    })

    const sortingUpdater = updateSearchMock.mock.calls[0]?.[0] as (
      previous: ClientsListSearch,
    ) => ClientsListSearch

    expect(sortingUpdater(makeSearch({ page: 8 }))).toEqual(
      makeSearch({ sortBy: 'name', sortOrder: 'asc', page: 1 }),
    )

    updateSearchMock.mockReset()

    act(() => {
      latest?.tableProps.onPaginationChange({ pageIndex: 2, pageSize: 20 })
    })

    const paginationUpdater = updateSearchMock.mock.calls[0]?.[0] as (
      previous: ClientsListSearch,
    ) => ClientsListSearch

    expect(paginationUpdater(makeSearch())).toEqual(
      makeSearch({ page: 3, limit: 20 }),
    )
  })

  it('creates a client from modal and forwards navigation callback', async () => {
    createClientMock.mockResolvedValueOnce({
      id: 'c0000000-0000-4000-8000-000000000001',
    })

    render(createElement(Harness, { search: makeSearch() }))

    act(() => {
      latest?.headerProps.onCreateClient()
      latest?.createDialogProps.onNameChange('Cliente creado')
      latest?.createDialogProps.onIsActiveChange(false)
    })

    await act(async () => {
      await latest?.createDialogProps.onSubmit()
    })

    expect(createClientMock).toHaveBeenCalledWith({
      name: 'Cliente creado',
      isActive: false,
    })
    expect(onClientCreatedMock).toHaveBeenCalledWith(
      'c0000000-0000-4000-8000-000000000001',
    )
  })
})
