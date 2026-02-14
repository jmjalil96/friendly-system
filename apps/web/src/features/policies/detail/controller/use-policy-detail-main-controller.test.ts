// @vitest-environment jsdom
import { createElement, type ReactElement } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, render } from '@testing-library/react'
import type { GetPolicyByIdResponse } from '@friendly-system/shared'
import {
  usePolicyDetailMainController,
  type UsePolicyDetailMainControllerResult,
} from '@/features/policies/detail/controller/use-policy-detail-main-controller'

const useUpdatePolicyMock = vi.hoisted(() => vi.fn())
const useLookupPolicyClientsMock = vi.hoisted(() => vi.fn())
const useLookupPolicyInsurersMock = vi.hoisted(() => vi.fn())
const useDebouncedValueMock = vi.hoisted(() => vi.fn())
const toastSuccessMock = vi.hoisted(() => vi.fn())

vi.mock('@/features/policies/api/policies.hooks', () => ({
  useUpdatePolicy: useUpdatePolicyMock,
  useLookupPolicyClients: useLookupPolicyClientsMock,
  useLookupPolicyInsurers: useLookupPolicyInsurersMock,
}))

vi.mock('@/shared/hooks/use-debounced-value', () => ({
  useDebouncedValue: useDebouncedValueMock,
}))

vi.mock('@/shared/hooks/use-toast', () => ({
  toast: {
    success: toastSuccessMock,
  },
}))

function makePolicy(
  overrides: Partial<GetPolicyByIdResponse> = {},
): GetPolicyByIdResponse {
  return {
    id: '67f1d6ce-8a62-4d4f-8607-8f5a5e91f6ad',
    policyNumber: 'POL-001',
    status: 'PENDING',
    clientId: 'd6a9d8a4-e0e2-4e99-aece-798f9047e0a6',
    clientName: 'Empresas Alpha S.A.',
    insurerId: 'ba7b5f90-1214-412d-b1bf-b41228d9f621',
    insurerName: 'Aseguradora Uno',
    type: 'HEALTH',
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    ambulatoryCoinsurancePct: null,
    hospitalaryCoinsurancePct: null,
    maternityCost: null,
    tPremium: '100.00',
    tplus1Premium: null,
    tplusfPremium: null,
    benefitsCostPerPerson: null,
    maxCoverage: '500000.00',
    deductible: '1200.00',
    planName: 'Plan Corporativo',
    employeeClass: 'Administrativo',
    cancellationReason: null,
    cancelledAt: null,
    createdAt: '2026-02-10T10:00:00.000Z',
    updatedAt: '2026-02-10T11:00:00.000Z',
    ...overrides,
  }
}

function getField(
  view: UsePolicyDetailMainControllerResult | null,
  sectionTitle: string,
  fieldLabel: string,
) {
  const section = view?.sections.find((item) => item.title === sectionTitle)
  return section?.fields.find((field) => field.label === fieldLabel)
}

describe('usePolicyDetailMainController', () => {
  let latest: UsePolicyDetailMainControllerResult | null = null
  const updatePolicy = vi.fn()

  function Harness({
    policy,
  }: {
    policy?: GetPolicyByIdResponse
  }): ReactElement {
    latest = usePolicyDetailMainController({
      policyId: policy?.id ?? '67f1d6ce-8a62-4d4f-8607-8f5a5e91f6ad',
      policy,
    })

    return createElement('div')
  }

  beforeEach(() => {
    latest = null
    updatePolicy.mockReset()
    updatePolicy.mockResolvedValue(undefined)
    useUpdatePolicyMock.mockReset()
    useLookupPolicyClientsMock.mockReset()
    useLookupPolicyInsurersMock.mockReset()
    useDebouncedValueMock.mockReset()
    toastSuccessMock.mockReset()

    useDebouncedValueMock.mockImplementation((value: string) => value)

    useUpdatePolicyMock.mockReturnValue({
      updatePolicy,
      updatePolicyStatus: 'idle',
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

  it('derives editability by status from shared constants', () => {
    render(
      createElement(Harness, { policy: makePolicy({ status: 'PENDING' }) }),
    )

    const policyNumberField = getField(latest, 'Datos principales', 'Número')
    const premiumField = getField(
      latest,
      'Condiciones económicas',
      'Prima titular',
    )

    expect(policyNumberField?.editable).toBe(true)
    expect(premiumField?.editable).toBe(true)

    cleanup()

    render(
      createElement(Harness, { policy: makePolicy({ status: 'EXPIRED' }) }),
    )
    const endDateField = getField(latest, 'Datos principales', 'Fin')
    expect(endDateField?.editable).toBe(false)
  })

  it('does not call mutation when save value is unchanged', async () => {
    render(createElement(Harness, { policy: makePolicy() }))

    const policyNumberField = getField(latest, 'Datos principales', 'Número')
    expect(policyNumberField).toBeDefined()

    act(() => {
      policyNumberField?.onStartEdit()
    })

    const editingPolicyNumberField = getField(
      latest,
      'Datos principales',
      'Número',
    )

    await act(async () => {
      await editingPolicyNumberField?.onSave()
    })

    expect(updatePolicy).not.toHaveBeenCalled()
  })

  it('normalizes decimal values and sends single-field PATCH payload', async () => {
    render(createElement(Harness, { policy: makePolicy({ status: 'ACTIVE' }) }))

    const premiumField = getField(
      latest,
      'Condiciones económicas',
      'Prima titular',
    )
    expect(premiumField).toBeDefined()

    act(() => {
      premiumField?.onStartEdit()
    })

    const editingPremiumField = getField(
      latest,
      'Condiciones económicas',
      'Prima titular',
    )

    act(() => {
      editingPremiumField?.onDraftChange('123,45')
    })

    const savingPremiumField = getField(
      latest,
      'Condiciones económicas',
      'Prima titular',
    )

    await act(async () => {
      await savingPremiumField?.onSave()
    })

    expect(updatePolicy).toHaveBeenCalledTimes(1)
    expect(updatePolicy).toHaveBeenCalledWith({
      tPremium: '123.45',
    })
    expect(toastSuccessMock).toHaveBeenCalledWith('Campo actualizado')
  })

  it('edits date fields using day-first input and saves ISO payload', async () => {
    render(createElement(Harness, { policy: makePolicy() }))

    const startDateField = getField(latest, 'Datos principales', 'Inicio')
    expect(startDateField).toBeDefined()

    act(() => {
      startDateField?.onStartEdit()
    })

    const editingStartDateField = getField(
      latest,
      'Datos principales',
      'Inicio',
    )
    expect(editingStartDateField?.draftValue).toBe('01/01/2026')

    act(() => {
      editingStartDateField?.onDraftChange('02/01/2026')
    })

    const savingStartDateField = getField(latest, 'Datos principales', 'Inicio')

    await act(async () => {
      await savingStartDateField?.onSave()
    })

    expect(updatePolicy).toHaveBeenCalledWith({
      startDate: '2026-01-02',
    })
  })

  it('uses lookup search when editing async combobox fields', () => {
    render(createElement(Harness, { policy: makePolicy() }))

    expect(useLookupPolicyClientsMock).toHaveBeenCalledWith({
      page: 1,
      limit: 100,
    })
    expect(useLookupPolicyInsurersMock).toHaveBeenCalledWith({
      page: 1,
      limit: 100,
    })

    const clientField = getField(latest, 'Datos principales', 'Cliente')
    expect(clientField).toBeDefined()

    act(() => {
      clientField?.onStartEdit()
      clientField?.onOptionsSearchChange?.('acme')
    })

    expect(useLookupPolicyClientsMock).toHaveBeenLastCalledWith({
      search: 'acme',
      page: 1,
      limit: 20,
    })
  })
})
