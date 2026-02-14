// @vitest-environment jsdom
import type { ComponentType } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import type { InsurersListSearch } from '@/features/insurers/model/insurers.search'

const useInsurersListControllerMock = vi.hoisted(() => vi.fn())

vi.mock(
  '@/features/insurers/list/controller/use-insurers-list-controller',
  () => ({
    useInsurersListController: useInsurersListControllerMock,
  }),
)

vi.mock('@/features/insurers/list/ui/insurers-list-header', () => ({
  InsurersListHeader: ({
    onCreateInsurer,
  }: {
    onCreateInsurer: () => void
  }) => (
    <button type="button" onClick={onCreateInsurer}>
      mock-insurers-list-header
    </button>
  ),
}))

vi.mock('@/features/insurers/list/ui/insurers-filter-bar', () => ({
  InsurersFilterBar: ({ search }: { search: string }) => (
    <div>mock-insurers-filter:{search}</div>
  ),
}))

vi.mock('@/features/insurers/list/ui/insurers-list-table', () => ({
  InsurersListTable: ({ isLoading }: { isLoading: boolean }) => (
    <div>mock-insurers-table:{String(isLoading)}</div>
  ),
}))

vi.mock('@/features/insurers/list/ui/insurer-create-dialog', () => ({
  InsurerCreateDialog: ({ open }: { open: boolean }) => (
    <div>mock-insurer-create-dialog:{String(open)}</div>
  ),
}))

import { Route } from '@/routes/_authenticated/aseguradoras/index'

const DEFAULT_SEARCH: InsurersListSearch = {
  sortBy: 'createdAt',
  sortOrder: 'desc',
  page: 1,
  limit: 20,
}

function renderPage() {
  const Component = Route.options.component as ComponentType
  return render(<Component />)
}

describe('aseguradoras index route', () => {
  const navigateMock = vi.fn()

  beforeEach(() => {
    navigateMock.mockReset()
    navigateMock.mockResolvedValue(undefined)

    useInsurersListControllerMock.mockReset()
    useInsurersListControllerMock.mockReturnValue({
      headerProps: {
        onCreateInsurer: vi.fn(),
      },
      filterBarProps: {
        search: 'sura',
        onSearchChange: vi.fn(),
        isActive: undefined,
        onIsActiveChange: vi.fn(),
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
      createDialogProps: {
        open: false,
        name: '',
        type: 'MEDICINA_PREPAGADA',
        isActive: true,
        isSubmitting: false,
        onOpenChange: vi.fn(),
        onNameChange: vi.fn(),
        onTypeChange: vi.fn(),
        onIsActiveChange: vi.fn(),
        onSubmit: vi.fn(),
      },
    })

    vi.spyOn(Route, 'useSearch').mockReturnValue(DEFAULT_SEARCH)
    vi.spyOn(Route, 'useNavigate').mockReturnValue(navigateMock)
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('applies validated search defaults with resilient fallback parsing', () => {
    const validateSearch = Route.options.validateSearch as (
      search: Record<string, unknown>,
    ) => InsurersListSearch

    expect(validateSearch({})).toEqual(DEFAULT_SEARCH)

    expect(
      validateSearch({
        search: 'sura',
        isActive: 'false',
        type: 'COMPANIA_DE_SEGUROS',
        sortBy: 'type',
        sortOrder: 'asc',
        page: '2',
        limit: '50',
      }),
    ).toEqual({
      search: 'sura',
      isActive: false,
      type: 'COMPANIA_DE_SEGUROS',
      sortBy: 'type',
      sortOrder: 'asc',
      page: 2,
      limit: 50,
    })

    expect(validateSearch({ page: 0 })).toEqual(DEFAULT_SEARCH)

    expect(
      validateSearch({
        search: 'sura',
        sortBy: 'name',
        page: 0,
      }),
    ).toEqual({
      search: 'sura',
      sortBy: 'name',
      sortOrder: 'desc',
      page: 1,
      limit: 20,
    })
  })

  it('orchestrates list wrappers and delegates create navigation to detail route', () => {
    const { container } = renderPage()

    expect(screen.queryByText('mock-insurers-list-header')).not.toBeNull()
    expect(screen.queryByText('mock-insurers-filter:sura')).not.toBeNull()
    expect(screen.queryByText('mock-insurers-table:false')).not.toBeNull()
    expect(
      screen.queryByText('mock-insurer-create-dialog:false'),
    ).not.toBeNull()

    const stickyChrome = container.querySelector(
      '[data-slot="insurers-list-top-chrome"]',
    )
    expect(stickyChrome).not.toBeNull()
    expect(stickyChrome?.className).toContain('lg:sticky')

    const hookInput = useInsurersListControllerMock.mock.calls[0]?.[0] as {
      search: InsurersListSearch
      updateSearch: (
        updater: (previous: InsurersListSearch) => InsurersListSearch,
        options?: { replace?: boolean },
      ) => void
      onInsurerCreated: (id: string) => void
    }

    expect(hookInput.search).toEqual(DEFAULT_SEARCH)

    hookInput.onInsurerCreated('insurer-id-1')
    expect(navigateMock).toHaveBeenCalledWith({
      to: '/aseguradoras/$id',
      params: { id: 'insurer-id-1' },
    })

    hookInput.updateSearch((previous) => ({ ...previous, page: 2 }), {
      replace: true,
    })

    expect(navigateMock).toHaveBeenCalledWith({
      search: expect.any(Function),
      replace: true,
    })
  })
})
