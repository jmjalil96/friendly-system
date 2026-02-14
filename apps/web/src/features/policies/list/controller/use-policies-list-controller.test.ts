// @vitest-environment jsdom
import { createElement, type ReactElement } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, render } from '@testing-library/react'
import type { PoliciesListSearch } from '@/features/policies/model/policies.search'
import {
  usePoliciesListController,
  type UsePoliciesListControllerResult,
} from '@/features/policies/list/controller/use-policies-list-controller'

const useListPoliciesMock = vi.hoisted(() => vi.fn())
const useCreatePolicyMock = vi.hoisted(() => vi.fn())
const useLookupPolicyClientsMock = vi.hoisted(() => vi.fn())
const useLookupPolicyInsurersMock = vi.hoisted(() => vi.fn())
const useDebouncedValueMock = vi.hoisted(() => vi.fn())

vi.mock('@/features/policies/api/policies.hooks', () => ({
  useListPolicies: useListPoliciesMock,
  useCreatePolicy: useCreatePolicyMock,
  useLookupPolicyClients: useLookupPolicyClientsMock,
  useLookupPolicyInsurers: useLookupPolicyInsurersMock,
}))

vi.mock('@/shared/hooks/use-debounced-value', () => ({
  useDebouncedValue: useDebouncedValueMock,
}))

const DEFAULT_SEARCH: PoliciesListSearch = {
  sortBy: 'createdAt',
  sortOrder: 'desc',
  page: 1,
  limit: 20,
}

function makeSearch(
  overrides: Partial<PoliciesListSearch> = {},
): PoliciesListSearch {
  return {
    ...DEFAULT_SEARCH,
    ...overrides,
  }
}

describe('usePoliciesListController', () => {
  let latest: UsePoliciesListControllerResult | null = null
  const updateSearchMock = vi.fn()
  const onPolicyCreatedMock = vi.fn()
  const createPolicy = vi.fn()

  function Harness({ search }: { search: PoliciesListSearch }): ReactElement {
    latest = usePoliciesListController({
      search,
      updateSearch: updateSearchMock,
      onPolicyCreated: onPolicyCreatedMock,
    })

    return createElement('div')
  }

  beforeEach(() => {
    latest = null
    updateSearchMock.mockReset()
    onPolicyCreatedMock.mockReset()
    createPolicy.mockReset()
    createPolicy.mockResolvedValue({
      id: '550e8400-e29b-41d4-a716-446655440000',
    })

    useDebouncedValueMock.mockReset()
    useDebouncedValueMock.mockImplementation((value: string) => value)

    useListPoliciesMock.mockReset()
    useCreatePolicyMock.mockReset()
    useLookupPolicyClientsMock.mockReset()
    useLookupPolicyInsurersMock.mockReset()

    useListPoliciesMock.mockReturnValue({
      data: {
        data: [],
        meta: { page: 1, limit: 20, totalCount: 0, totalPages: 0 },
      },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    })

    useCreatePolicyMock.mockReturnValue({
      createPolicy,
      createPolicyStatus: 'idle',
    })

    useLookupPolicyClientsMock.mockReturnValue({
      data: { data: [] },
      isFetching: false,
    })

    useLookupPolicyInsurersMock.mockReturnValue({
      data: { data: [] },
      isFetching: false,
    })
  })

  afterEach(() => {
    cleanup()
  })

  it('maps URL search params into list query input', () => {
    render(
      createElement(Harness, {
        search: makeSearch({
          search: 'POL',
          status: ['PENDING', 'ACTIVE'],
          sortBy: 'policyNumber',
          sortOrder: 'asc',
          page: 3,
          limit: 50,
        }),
      }),
    )

    expect(useListPoliciesMock).toHaveBeenCalledWith({
      search: 'POL',
      status: ['PENDING', 'ACTIVE'],
      sortBy: 'policyNumber',
      sortOrder: 'asc',
      page: 3,
      limit: 50,
    })
  })

  it('creates a policy from dialog state and emits created id callback', async () => {
    render(createElement(Harness, { search: makeSearch() }))

    act(() => {
      latest?.headerProps.onCreatePolicy()
    })
    expect(latest?.createDialogProps.open).toBe(true)

    act(() => {
      latest?.createDialogProps.onPolicyNumberChange('POL-2026-001')
      latest?.createDialogProps.onClientChange(
        '11111111-1111-4111-8111-111111111111',
      )
      latest?.createDialogProps.onInsurerChange(
        '22222222-2222-4222-8222-222222222222',
      )
      latest?.createDialogProps.onStartDateChange('2026-01-01')
      latest?.createDialogProps.onEndDateChange('2026-12-31')
    })

    await act(async () => {
      await latest?.createDialogProps.onSubmit()
    })

    expect(createPolicy).toHaveBeenCalledWith({
      policyNumber: 'POL-2026-001',
      clientId: '11111111-1111-4111-8111-111111111111',
      insurerId: '22222222-2222-4222-8222-222222222222',
      planName: undefined,
      employeeClass: undefined,
      maxCoverage: undefined,
      deductible: undefined,
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      type: undefined,
    })
    expect(onPolicyCreatedMock).toHaveBeenCalledWith(
      '550e8400-e29b-41d4-a716-446655440000',
    )
  })

  it('shows validation error when required create fields are missing', async () => {
    render(createElement(Harness, { search: makeSearch() }))

    act(() => {
      latest?.headerProps.onCreatePolicy()
    })

    await act(async () => {
      await latest?.createDialogProps.onSubmit()
    })

    expect(createPolicy).not.toHaveBeenCalled()
    expect(latest?.createDialogProps.error).toBeTruthy()
  })
})
