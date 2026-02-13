// @vitest-environment jsdom
import type { ComponentType } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import type { ClientsListSearch } from '@/features/clients/model/clients.search'

const useClientsListControllerMock = vi.hoisted(() => vi.fn())

vi.mock(
  '@/features/clients/list/controller/use-clients-list-controller',
  () => ({
    useClientsListController: useClientsListControllerMock,
  }),
)

vi.mock('@/features/clients/list/ui/clients-list-header', () => ({
  ClientsListHeader: ({ onCreateClient }: { onCreateClient: () => void }) => (
    <button type="button" onClick={onCreateClient}>
      mock-clients-list-header
    </button>
  ),
}))

vi.mock('@/features/clients/list/ui/clients-filter-bar', () => ({
  ClientsFilterBar: ({ search }: { search: string }) => (
    <div>mock-clients-filter:{search}</div>
  ),
}))

vi.mock('@/features/clients/list/ui/clients-list-table', () => ({
  ClientsListTable: ({ isLoading }: { isLoading: boolean }) => (
    <div>mock-clients-table:{String(isLoading)}</div>
  ),
}))

vi.mock('@/features/clients/list/ui/client-create-dialog', () => ({
  ClientCreateDialog: ({ open }: { open: boolean }) => (
    <div>mock-client-create-dialog:{String(open)}</div>
  ),
}))

import { Route } from '@/routes/_authenticated/clientes/index'

const DEFAULT_SEARCH: ClientsListSearch = {
  sortBy: 'createdAt',
  sortOrder: 'desc',
  page: 1,
  limit: 20,
}

function renderPage() {
  const Component = Route.options.component as ComponentType
  return render(<Component />)
}

describe('clientes index route', () => {
  const navigateMock = vi.fn()

  beforeEach(() => {
    navigateMock.mockReset()
    navigateMock.mockResolvedValue(undefined)

    useClientsListControllerMock.mockReset()
    useClientsListControllerMock.mockReturnValue({
      headerProps: {
        onCreateClient: vi.fn(),
      },
      filterBarProps: {
        search: 'alpha',
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
        isActive: true,
        isSubmitting: false,
        onOpenChange: vi.fn(),
        onNameChange: vi.fn(),
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
    ) => ClientsListSearch

    expect(validateSearch({})).toEqual(DEFAULT_SEARCH)

    expect(
      validateSearch({
        search: 'alpha',
        isActive: 'false',
        sortBy: 'name',
        sortOrder: 'asc',
        page: '2',
        limit: '50',
      }),
    ).toEqual({
      search: 'alpha',
      isActive: false,
      sortBy: 'name',
      sortOrder: 'asc',
      page: 2,
      limit: 50,
    })

    expect(validateSearch({ page: 0 })).toEqual(DEFAULT_SEARCH)

    expect(
      validateSearch({
        search: 'alpha',
        sortBy: 'name',
        page: 0,
      }),
    ).toEqual({
      search: 'alpha',
      sortBy: 'name',
      sortOrder: 'desc',
      page: 1,
      limit: 20,
    })
  })

  it('orchestrates list wrappers and delegates create navigation to detail route', () => {
    const { container } = renderPage()

    expect(screen.queryByText('mock-clients-list-header')).not.toBeNull()
    expect(screen.queryByText('mock-clients-filter:alpha')).not.toBeNull()
    expect(screen.queryByText('mock-clients-table:false')).not.toBeNull()
    expect(screen.queryByText('mock-client-create-dialog:false')).not.toBeNull()

    const stickyChrome = container.querySelector(
      '[data-slot="clients-list-top-chrome"]',
    )
    expect(stickyChrome).not.toBeNull()
    expect(stickyChrome?.className).toContain('lg:sticky')

    const hookInput = useClientsListControllerMock.mock.calls[0]?.[0] as {
      search: ClientsListSearch
      updateSearch: (
        updater: (previous: ClientsListSearch) => ClientsListSearch,
        options?: { replace?: boolean },
      ) => void
      onClientCreated: (id: string) => void
    }

    expect(hookInput.search).toEqual(DEFAULT_SEARCH)

    hookInput.onClientCreated('client-id-1')
    expect(navigateMock).toHaveBeenCalledWith({
      to: '/clientes/$id',
      params: { id: 'client-id-1' },
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
