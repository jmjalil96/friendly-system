// @vitest-environment jsdom
import { createElement, type ReactElement } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, render } from '@testing-library/react'
import type { GetClaimByIdResponse } from '@friendly-system/shared'
import {
  useClaimDetailMainController,
  type UseClaimDetailMainControllerResult,
} from '@/features/claims/detail/controller/use-claim-detail-main-controller'
import {
  formatClaimDateOnly,
  formatClaimDateTime,
} from '@/features/claims/model/claims.formatters'

const useUpdateClaimMock = vi.hoisted(() => vi.fn())
const useLookupClientPoliciesMock = vi.hoisted(() => vi.fn())
const toastSuccessMock = vi.hoisted(() => vi.fn())

vi.mock('@/features/claims/api/claims.hooks', () => ({
  useUpdateClaim: useUpdateClaimMock,
  useLookupClientPolicies: useLookupClientPoliciesMock,
}))

vi.mock('@/shared/hooks/use-toast', () => ({
  toast: {
    success: toastSuccessMock,
  },
}))

function makeClaim(
  overrides: Partial<GetClaimByIdResponse> = {},
): GetClaimByIdResponse {
  return {
    id: '67f1d6ce-8a62-4d4f-8607-8f5a5e91f6ad',
    claimNumber: 25,
    status: 'DRAFT',
    clientId: 'd6a9d8a4-e0e2-4e99-aece-798f9047e0a6',
    clientName: 'Empresas Alpha S.A.',
    affiliateId: 'b3f4fc33-6efa-45d0-b4dc-a84ca58e9f5b',
    affiliateFirstName: 'Carlos',
    affiliateLastName: 'Perez',
    patientId: 'ba7b5f90-1214-412d-b1bf-b41228d9f621',
    patientFirstName: 'Ana',
    patientLastName: 'Perez',
    policyId: null,
    policyNumber: null,
    policyInsurerName: null,
    description: 'Descripcion inicial',
    careType: null,
    diagnosis: null,
    amountSubmitted: null,
    amountApproved: null,
    amountDenied: null,
    amountUnprocessed: null,
    deductibleApplied: null,
    copayApplied: null,
    incidentDate: null,
    submittedDate: null,
    settlementDate: null,
    businessDays: null,
    settlementNumber: null,
    settlementNotes: null,
    createdById: '767d408a-fabf-47ca-971e-1f86d0cf26c5',
    updatedById: null,
    createdAt: '2026-02-10T10:00:00.000Z',
    updatedAt: '2026-02-10T11:00:00.000Z',
    ...overrides,
  }
}

function getField(
  view: UseClaimDetailMainControllerResult | null,
  sectionTitle: string,
  fieldLabel: string,
) {
  const section = view?.sections.find((item) => item.title === sectionTitle)
  return section?.fields.find((field) => field.label === fieldLabel)
}

function getSummaryItem(
  view: UseClaimDetailMainControllerResult | null,
  label: string,
) {
  return view?.summary.items.find((item) => item.label === label)
}

describe('useClaimDetailMainController', () => {
  let latest: UseClaimDetailMainControllerResult | null = null
  const updateClaim = vi.fn()

  function Harness({ claim }: { claim?: GetClaimByIdResponse }): ReactElement {
    latest = useClaimDetailMainController({
      claimId: claim?.id ?? '67f1d6ce-8a62-4d4f-8607-8f5a5e91f6ad',
      claim,
    })

    return createElement('div')
  }

  beforeEach(() => {
    latest = null
    updateClaim.mockReset()
    updateClaim.mockResolvedValue(undefined)
    useUpdateClaimMock.mockReset()
    useLookupClientPoliciesMock.mockReset()
    toastSuccessMock.mockReset()

    useUpdateClaimMock.mockReturnValue({
      updateClaim,
      updateClaimStatus: 'idle',
    })

    useLookupClientPoliciesMock.mockReturnValue({
      data: { data: [] },
      isFetching: false,
    })
  })

  afterEach(() => {
    cleanup()
  })

  it('derives editability by status from shared constants', () => {
    render(createElement(Harness, { claim: makeClaim({ status: 'DRAFT' }) }))

    const descriptionField = getField(latest, 'Datos principales', 'Descripcion')
    const approvedAmountField = getField(latest, 'Liquidacion', 'Monto aprobado')

    expect(descriptionField?.editable).toBe(true)
    expect(approvedAmountField?.editable).toBe(false)
  })

  it('builds summary names from claim-by-id response fields with ID fallback', () => {
    const claim = makeClaim({ status: 'IN_REVIEW' })

    render(createElement(Harness, { claim }))

    expect(getSummaryItem(latest, 'Cliente')?.value).toBe(claim.clientName)
    expect(getSummaryItem(latest, 'Afiliado')?.value).toBe('Carlos Perez')
    expect(getSummaryItem(latest, 'Paciente')?.value).toBe('Ana Perez')

    cleanup()

    render(
      createElement(Harness, {
        claim: makeClaim({
          clientName: '',
          affiliateFirstName: '',
          affiliateLastName: '',
          patientFirstName: '',
          patientLastName: '',
        }),
      }),
    )

    expect(getSummaryItem(latest, 'Cliente')?.value).toBe(
      'd6a9d8a4-e0e2-4e99-aece-798f9047e0a6',
    )
    expect(getSummaryItem(latest, 'Afiliado')?.value).toBe(
      'b3f4fc33-6efa-45d0-b4dc-a84ca58e9f5b',
    )
    expect(getSummaryItem(latest, 'Paciente')?.value).toBe(
      'ba7b5f90-1214-412d-b1bf-b41228d9f621',
    )
  })

  it('uses policy display fields from claim-by-id and falls back to policy ID', () => {
    const claim = makeClaim({
      policyId: 'policy-id-001',
      policyNumber: 'POL-001',
      policyInsurerName: 'Acme Insurance',
    })

    render(createElement(Harness, { claim }))

    const policyField = getField(latest, 'Datos principales', 'Poliza')
    expect(policyField?.displayValue).toContain('POL-001')
    expect(getSummaryItem(latest, 'Poliza')?.value).toContain('POL-001')

    cleanup()

    render(
      createElement(Harness, {
        claim: makeClaim({
          policyId: 'policy-id-001',
          policyNumber: null,
          policyInsurerName: null,
        }),
      }),
    )
    expect(getSummaryItem(latest, 'Poliza')?.value).toBe('policy-id-001')
  })

  it('keeps policy lookup disabled until policy field enters edit mode', () => {
    const claim = makeClaim({ policyId: 'policy-id-001' })

    render(createElement(Harness, { claim }))

    expect(useLookupClientPoliciesMock).toHaveBeenCalledWith('', {
      page: 1,
      limit: 100,
    })

    const policyField = getField(latest, 'Datos principales', 'Poliza')
    expect(policyField).toBeDefined()

    act(() => {
      policyField?.onStartEdit()
    })

    expect(useLookupClientPoliciesMock).toHaveBeenLastCalledWith(claim.clientId, {
      page: 1,
      limit: 100,
    })
  })

  it('does not call mutation when save value is unchanged', async () => {
    render(createElement(Harness, { claim: makeClaim() }))

    const descriptionField = getField(latest, 'Datos principales', 'Descripcion')
    expect(descriptionField).toBeDefined()

    act(() => {
      descriptionField?.onStartEdit()
    })

    const editingDescriptionField = getField(
      latest,
      'Datos principales',
      'Descripcion',
    )

    await act(async () => {
      await editingDescriptionField?.onSave()
    })

    expect(updateClaim).not.toHaveBeenCalled()
  })

  it('normalizes decimal values and sends single-field PATCH payload', async () => {
    render(
      createElement(Harness, {
        claim: makeClaim({
          status: 'IN_REVIEW',
          amountSubmitted: '100.00',
        }),
      }),
    )

    const amountSubmittedField = getField(
      latest,
      'Presentacion',
      'Monto presentado',
    )
    expect(amountSubmittedField).toBeDefined()

    act(() => {
      amountSubmittedField?.onStartEdit()
    })

    const editingAmountSubmittedField = getField(
      latest,
      'Presentacion',
      'Monto presentado',
    )

    act(() => {
      editingAmountSubmittedField?.onDraftChange('123,45')
    })

    const savingAmountSubmittedField = getField(
      latest,
      'Presentacion',
      'Monto presentado',
    )

    await act(async () => {
      await savingAmountSubmittedField?.onSave()
    })

    expect(updateClaim).toHaveBeenCalledTimes(1)
    expect(updateClaim).toHaveBeenCalledWith({
      amountSubmitted: '123.45',
    })
    expect(toastSuccessMock).toHaveBeenCalledWith('Campo actualizado')
  })

  it('edits date fields using day-first input and saves ISO payload', async () => {
    render(
      createElement(Harness, {
        claim: makeClaim({
          status: 'IN_REVIEW',
          incidentDate: '2026-01-15',
        }),
      }),
    )

    const incidentDateField = getField(
      latest,
      'Datos principales',
      'Fecha de incidente',
    )
    expect(incidentDateField).toBeDefined()

    act(() => {
      incidentDateField?.onStartEdit()
    })

    const editingIncidentDateField = getField(
      latest,
      'Datos principales',
      'Fecha de incidente',
    )
    expect(editingIncidentDateField?.draftValue).toBe('15/01/2026')

    act(() => {
      editingIncidentDateField?.onDraftChange('16/01/2026')
    })

    const savingIncidentDateField = getField(
      latest,
      'Datos principales',
      'Fecha de incidente',
    )

    await act(async () => {
      await savingIncidentDateField?.onSave()
    })

    expect(updateClaim).toHaveBeenCalledTimes(1)
    expect(updateClaim).toHaveBeenCalledWith({
      incidentDate: '2026-01-16',
    })
    expect(toastSuccessMock).toHaveBeenCalledWith('Campo actualizado')
  })

  it('validates invalid day-first date input on blur before save', () => {
    render(
      createElement(Harness, {
        claim: makeClaim({
          status: 'IN_REVIEW',
          incidentDate: '2026-01-15',
        }),
      }),
    )

    const incidentDateField = getField(
      latest,
      'Datos principales',
      'Fecha de incidente',
    )
    expect(incidentDateField).toBeDefined()

    act(() => {
      incidentDateField?.onStartEdit()
    })

    const editingIncidentDateField = getField(
      latest,
      'Datos principales',
      'Fecha de incidente',
    )

    act(() => {
      editingIncidentDateField?.onDraftChange('31/02/2026')
    })

    const blurIncidentDateField = getField(
      latest,
      'Datos principales',
      'Fecha de incidente',
    )

    act(() => {
      blurIncidentDateField?.onDraftBlur?.()
    })

    const invalidDateField = getField(
      latest,
      'Datos principales',
      'Fecha de incidente',
    )
    expect(updateClaim).not.toHaveBeenCalled()
    expect(invalidDateField?.error).toBe('Fecha invalida. Usa DD/MM/AAAA.')
  })

  it('shows date validation error for invalid day-first date input', async () => {
    render(
      createElement(Harness, {
        claim: makeClaim({
          status: 'IN_REVIEW',
          incidentDate: '2026-01-15',
        }),
      }),
    )

    const incidentDateField = getField(
      latest,
      'Datos principales',
      'Fecha de incidente',
    )
    expect(incidentDateField).toBeDefined()

    act(() => {
      incidentDateField?.onStartEdit()
    })

    const editingIncidentDateField = getField(
      latest,
      'Datos principales',
      'Fecha de incidente',
    )

    act(() => {
      editingIncidentDateField?.onDraftChange('31/02/2026')
    })

    const savingIncidentDateField = getField(
      latest,
      'Datos principales',
      'Fecha de incidente',
    )

    await act(async () => {
      await savingIncidentDateField?.onSave()
    })

    const invalidDateField = getField(
      latest,
      'Datos principales',
      'Fecha de incidente',
    )
    expect(updateClaim).not.toHaveBeenCalled()
    expect(invalidDateField?.error).toBe('Fecha invalida. Usa DD/MM/AAAA.')
  })

  it('resets inline edit state when claim id changes', async () => {
    const firstClaim = makeClaim({
      id: '11111111-1111-4111-8111-111111111111',
      description: 'Descripcion A',
    })
    const secondClaim = makeClaim({
      id: '22222222-2222-4222-8222-222222222222',
      description: 'Descripcion B',
    })

    const { rerender } = render(createElement(Harness, { claim: firstClaim }))

    const initialDescriptionField = getField(
      latest,
      'Datos principales',
      'Descripcion',
    )
    expect(initialDescriptionField).toBeDefined()

    act(() => {
      initialDescriptionField?.onStartEdit()
    })

    const editingDescriptionField = getField(
      latest,
      'Datos principales',
      'Descripcion',
    )
    expect(editingDescriptionField?.isEditing).toBe(true)

    act(() => {
      editingDescriptionField?.onDraftChange('Borrador temporal')
    })

    const dirtyDescriptionField = getField(
      latest,
      'Datos principales',
      'Descripcion',
    )
    expect(dirtyDescriptionField?.draftValue).toBe('Borrador temporal')

    rerender(createElement(Harness, { claim: secondClaim }))

    const resetDescriptionField = getField(
      latest,
      'Datos principales',
      'Descripcion',
    )
    expect(resetDescriptionField?.isEditing).toBe(false)
    expect(resetDescriptionField?.draftValue).toBe('Descripcion B')

    await act(async () => {
      await resetDescriptionField?.onSave()
    })

    expect(updateClaim).not.toHaveBeenCalled()
  })

  it('uses shared claims formatters for date-only and date-time display', () => {
    const claim = makeClaim({
      incidentDate: '2026-01-15',
      createdAt: '2026-02-10T10:00:00.000Z',
    })

    render(createElement(Harness, { claim }))

    const incidentDateField = getField(
      latest,
      'Datos principales',
      'Fecha de incidente',
    )
    expect(incidentDateField?.displayValue).toBe(formatClaimDateOnly('2026-01-15'))
    expect(getSummaryItem(latest, 'Creado')?.value).toBe(
      formatClaimDateTime(claim.createdAt, 'datetime'),
    )
  })
})
