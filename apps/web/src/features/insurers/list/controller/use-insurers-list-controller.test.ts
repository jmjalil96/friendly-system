// @vitest-environment jsdom
import { createElement, type ReactElement } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, render } from '@testing-library/react'
import type { InsurersListSearch } from '@/features/insurers/model/insurers.search'
import {
  type UseInsurersListControllerResult,
  useInsurersListController,
} from '@/features/insurers/list/controller/use-insurers-list-controller'

const useListInsurersMock = vi.hoisted(() => vi.fn())
const useCreateInsurerMock = vi.hoisted(() => vi.fn())

vi.mock('@/features/insurers/api/insurers.hooks', () => ({
  useListInsurers: useListInsurersMock,
  useCreateInsurer: useCreateInsurerMock,
}))

const DEFAULT_SEARCH: InsurersListSearch = {
  sortBy: 'createdAt',
  sortOrder: 'desc',
  page: 1,
  limit: 20,
}

function makeSearch(
  overrides: Partial<InsurersListSearch> = {},
): InsurersListSearch {
  return {
    ...DEFAULT_SEARCH,
    ...overrides,
  }
}

describe('useInsurersListController', () => {
  let latest: UseInsurersListControllerResult | null = null
  const updateSearchMock = vi.fn()
  const onInsurerCreatedMock = vi.fn()
  const createInsurerMock = vi.fn()

  function Harness({ search }: { search: InsurersListSearch }): ReactElement {
    latest = useInsurersListController({
      search,
      updateSearch: updateSearchMock,
      onInsurerCreated: onInsurerCreatedMock,
    })

    return createElement('div')
  }

  beforeEach(() => {
    latest = null
    vi.useFakeTimers()
    updateSearchMock.mockReset()
    onInsurerCreatedMock.mockReset()
    createInsurerMock.mockReset()

    useListInsurersMock.mockReset()
    useListInsurersMock.mockReturnValue({
      data: {
        data: [],
        meta: { page: 1, limit: 20, totalCount: 0, totalPages: 0 },
      },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    })

    useCreateInsurerMock.mockReset()
    useCreateInsurerMock.mockReturnValue({
      createInsurer: createInsurerMock,
      createInsurerStatus: 'idle',
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
          search: 'sura',
          isActive: false,
          sortBy: 'name',
          sortOrder: 'asc',
          page: 3,
          limit: 50,
        }),
      }),
    )

    expect(useListInsurersMock).toHaveBeenCalledWith({
      search: 'sura',
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
      previous: InsurersListSearch,
    ) => InsurersListSearch

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
      previous: InsurersListSearch,
    ) => InsurersListSearch

    expect(activeUpdater(makeSearch({ page: 4 }))).toEqual(
      makeSearch({ isActive: true, page: 1 }),
    )

    updateSearchMock.mockReset()

    act(() => {
      latest?.tableProps.onSortingChange([{ id: 'name', desc: false }])
    })

    const sortingUpdater = updateSearchMock.mock.calls[0]?.[0] as (
      previous: InsurersListSearch,
    ) => InsurersListSearch

    expect(sortingUpdater(makeSearch({ page: 8 }))).toEqual(
      makeSearch({ sortBy: 'name', sortOrder: 'asc', page: 1 }),
    )

    updateSearchMock.mockReset()

    act(() => {
      latest?.tableProps.onPaginationChange({ pageIndex: 2, pageSize: 20 })
    })

    const paginationUpdater = updateSearchMock.mock.calls[0]?.[0] as (
      previous: InsurersListSearch,
    ) => InsurersListSearch

    expect(paginationUpdater(makeSearch())).toEqual(
      makeSearch({ page: 3, limit: 20 }),
    )
  })

  it('creates an insurer from modal and forwards navigation callback', async () => {
    createInsurerMock.mockResolvedValueOnce({
      id: 'c0000000-0000-4000-8000-000000000001',
    })

    render(createElement(Harness, { search: makeSearch() }))

    act(() => {
      latest?.headerProps.onCreateInsurer()
      latest?.createDialogProps.onNameChange('Aseguradora creada')
      latest?.createDialogProps.onTypeChange('COMPANIA_DE_SEGUROS')
      latest?.createDialogProps.onIsActiveChange(false)
    })

    await act(async () => {
      await latest?.createDialogProps.onSubmit()
    })

    expect(createInsurerMock).toHaveBeenCalledWith({
      name: 'Aseguradora creada',
      type: 'COMPANIA_DE_SEGUROS',
      isActive: false,
    })
    expect(onInsurerCreatedMock).toHaveBeenCalledWith(
      'c0000000-0000-4000-8000-000000000001',
    )
  })
})
