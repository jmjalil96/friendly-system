// @vitest-environment jsdom
import type { ComponentType } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { PoliciesListSearch } from '@/features/policies/model/policies.search'

const usePoliciesListControllerMock = vi.hoisted(() => vi.fn())

vi.mock(
  '@/features/policies/list/controller/use-policies-list-controller',
  () => ({
    usePoliciesListController: usePoliciesListControllerMock,
  }),
)

vi.mock('@/features/policies/list/ui/policies-list-header', () => ({
  PoliciesListHeader: ({ onCreatePolicy }: { onCreatePolicy: () => void }) => (
    <button type="button" onClick={onCreatePolicy}>
      mock-policies-list-header
    </button>
  ),
}))

vi.mock('@/features/policies/list/ui/policies-filter-bar', () => ({
  PoliciesFilterBar: ({ search }: { search: string }) => (
    <div>mock-policies-filter:{search}</div>
  ),
}))

vi.mock('@/features/policies/list/ui/policies-list-table', () => ({
  PoliciesListTable: ({ isLoading }: { isLoading: boolean }) => (
    <div>mock-policies-table:{String(isLoading)}</div>
  ),
}))

vi.mock('@/features/policies/list/ui/policy-create-dialog', () => ({
  PolicyCreateDialog: ({ open }: { open: boolean }) => (
    <div>mock-policy-create-dialog:{String(open)}</div>
  ),
}))

import { Route } from '@/routes/_authenticated/polizas/index'

const DEFAULT_SEARCH: PoliciesListSearch = {
  sortBy: 'createdAt',
  sortOrder: 'desc',
  page: 1,
  limit: 20,
}

function renderPage() {
  const Component = Route.options.component as ComponentType
  return render(<Component />)
}

describe('polizas index route', () => {
  const navigateMock = vi.fn()

  beforeEach(() => {
    navigateMock.mockReset()
    navigateMock.mockResolvedValue(undefined)

    usePoliciesListControllerMock.mockReset()
    usePoliciesListControllerMock.mockReturnValue({
      headerProps: {
        onCreatePolicy: vi.fn(),
      },
      filterBarProps: {
        search: 'alpha',
        onSearchChange: vi.fn(),
        selectedStatuses: [],
        onToggleStatus: vi.fn(),
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
        policyNumber: '',
        clientId: '',
        insurerId: '',
        planName: '',
        employeeClass: '',
        maxCoverage: '',
        deductible: '',
        startDate: '',
        endDate: '',
        clientSearch: '',
        insurerSearch: '',
        clients: [],
        insurers: [],
        clientsLoading: false,
        insurersLoading: false,
        isSubmitting: false,
        onOpenChange: vi.fn(),
        onPolicyNumberChange: vi.fn(),
        onClientChange: vi.fn(),
        onInsurerChange: vi.fn(),
        onTypeChange: vi.fn(),
        onPlanNameChange: vi.fn(),
        onEmployeeClassChange: vi.fn(),
        onMaxCoverageChange: vi.fn(),
        onDeductibleChange: vi.fn(),
        onStartDateChange: vi.fn(),
        onEndDateChange: vi.fn(),
        onClientSearchChange: vi.fn(),
        onInsurerSearchChange: vi.fn(),
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
    ) => PoliciesListSearch

    expect(validateSearch({})).toEqual(DEFAULT_SEARCH)

    expect(
      validateSearch({
        search: 'alpha',
        status: 'PENDING',
        sortBy: 'policyNumber',
        sortOrder: 'asc',
        page: '2',
        limit: '50',
      }),
    ).toEqual({
      search: 'alpha',
      status: ['PENDING'],
      sortBy: 'policyNumber',
      sortOrder: 'asc',
      page: 2,
      limit: 50,
    })

    expect(validateSearch({ page: 0 })).toEqual(DEFAULT_SEARCH)

    expect(
      validateSearch({
        search: 'alpha',
        sortBy: 'policyNumber',
        page: 0,
      }),
    ).toEqual({
      search: 'alpha',
      sortBy: 'policyNumber',
      sortOrder: 'desc',
      page: 1,
      limit: 20,
    })
  })

  it('orchestrates list wrappers and delegates create navigation to detail route', () => {
    const { container } = renderPage()

    expect(screen.queryByText('mock-policies-list-header')).not.toBeNull()
    expect(screen.queryByText('mock-policies-filter:alpha')).not.toBeNull()
    expect(screen.queryByText('mock-policies-table:false')).not.toBeNull()
    expect(screen.queryByText('mock-policy-create-dialog:false')).not.toBeNull()

    const stickyChrome = container.querySelector(
      '[data-slot="policies-list-top-chrome"]',
    )
    expect(stickyChrome).not.toBeNull()
    expect(stickyChrome?.className).toContain('lg:sticky')

    const hookInput = usePoliciesListControllerMock.mock.calls[0]?.[0] as {
      search: PoliciesListSearch
      updateSearch: (
        updater: (previous: PoliciesListSearch) => PoliciesListSearch,
        options?: { replace?: boolean },
      ) => void
      onPolicyCreated: (id: string) => void
    }

    expect(hookInput.search).toEqual(DEFAULT_SEARCH)

    hookInput.onPolicyCreated('policy-id-1')
    expect(navigateMock).toHaveBeenCalledWith({
      to: '/polizas/$id',
      params: { id: 'policy-id-1' },
    })

    hookInput.updateSearch((previous) => ({ ...previous, page: 2 }), {
      replace: true,
    })

    expect(navigateMock).toHaveBeenCalledWith({
      search: expect.any(Function),
      replace: true,
    })

    fireEvent.click(
      screen.getByRole('button', { name: 'mock-policies-list-header' }),
    )
  })
})
