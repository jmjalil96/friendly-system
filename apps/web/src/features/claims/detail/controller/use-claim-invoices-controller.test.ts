// @vitest-environment jsdom
import { createElement, type ReactElement } from 'react'
import { act, cleanup, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ClaimInvoicesResponse } from '@friendly-system/shared'
import {
  useClaimInvoicesController,
  type UseClaimInvoicesControllerResult,
} from '@/features/claims/detail/controller/use-claim-invoices-controller'

const useClaimInvoicesMock = vi.hoisted(() => vi.fn())
const useCreateClaimInvoiceMock = vi.hoisted(() => vi.fn())
const useUpdateClaimInvoiceMock = vi.hoisted(() => vi.fn())
const useDeleteClaimInvoiceMock = vi.hoisted(() => vi.fn())
const toastSuccessMock = vi.hoisted(() => vi.fn())

vi.mock('@/features/claims/api/claims.hooks', () => ({
  useClaimInvoices: useClaimInvoicesMock,
  useCreateClaimInvoice: useCreateClaimInvoiceMock,
  useUpdateClaimInvoice: useUpdateClaimInvoiceMock,
  useDeleteClaimInvoice: useDeleteClaimInvoiceMock,
}))

vi.mock('@/shared/hooks/use-toast', () => ({
  toast: {
    success: toastSuccessMock,
  },
}))

function makeInvoicesResponse(
  overrides: Partial<ClaimInvoicesResponse> = {},
): ClaimInvoicesResponse {
  return {
    data: [
      {
        id: 'a0000000-0000-4000-8000-000000000011',
        claimId: 'a0000000-0000-4000-8000-000000000001',
        invoiceNumber: 'INV-001',
        providerName: 'Provider One',
        amountSubmitted: '30.5',
        createdById: 'a0000000-0000-4000-8000-000000000101',
        createdAt: '2026-02-10T10:00:00.000Z',
      },
      {
        id: 'a0000000-0000-4000-8000-000000000012',
        claimId: 'a0000000-0000-4000-8000-000000000001',
        invoiceNumber: 'INV-002',
        providerName: 'Provider Two',
        amountSubmitted: '45.00',
        createdById: 'a0000000-0000-4000-8000-000000000102',
        createdAt: '2026-02-09T10:00:00.000Z',
      },
    ],
    meta: {
      page: 1,
      limit: 20,
      totalCount: 2,
      totalPages: 1,
    },
    ...overrides,
  }
}

describe('useClaimInvoicesController', () => {
  let latest: UseClaimInvoicesControllerResult | null = null
  const createInvoice = vi.fn()
  const updateInvoice = vi.fn()
  const deleteInvoice = vi.fn()
  const refetch = vi.fn()
  let invoicesResponse: ClaimInvoicesResponse
  let isLoading = false
  let isError = false

  function Harness({ claimId }: { claimId: string }): ReactElement {
    latest = useClaimInvoicesController({ claimId })
    return createElement('div')
  }

  beforeEach(() => {
    latest = null
    createInvoice.mockReset()
    updateInvoice.mockReset()
    deleteInvoice.mockReset()
    refetch.mockReset()
    toastSuccessMock.mockReset()

    createInvoice.mockResolvedValue(undefined)
    updateInvoice.mockResolvedValue(undefined)
    deleteInvoice.mockResolvedValue(undefined)
    refetch.mockResolvedValue(undefined)

    invoicesResponse = makeInvoicesResponse()
    isLoading = false
    isError = false

    useClaimInvoicesMock.mockReset()
    useCreateClaimInvoiceMock.mockReset()
    useUpdateClaimInvoiceMock.mockReset()
    useDeleteClaimInvoiceMock.mockReset()

    useClaimInvoicesMock.mockImplementation(() => ({
      data: invoicesResponse,
      isLoading,
      isError,
      refetch,
    }))

    useCreateClaimInvoiceMock.mockReturnValue({
      createInvoice,
      createInvoiceStatus: 'idle',
    })
    useUpdateClaimInvoiceMock.mockReturnValue({
      updateInvoice,
      updateInvoiceStatus: 'idle',
    })
    useDeleteClaimInvoiceMock.mockReturnValue({
      deleteInvoice,
      deleteInvoiceStatus: 'idle',
    })
  })

  afterEach(() => {
    cleanup()
  })

  it('binds invoices query and pagination defaults', () => {
    render(createElement(Harness, { claimId: 'claim-id-1' }))

    expect(useClaimInvoicesMock).toHaveBeenCalledWith('claim-id-1', {
      page: 1,
      limit: 20,
    })
    expect(latest?.list.invoices).toHaveLength(2)
    expect(latest?.pagination.page).toBe(1)
    expect(latest?.pagination.limit).toBe(20)
    expect(latest?.pagination.totalCount).toBe(2)
  })

  it('creates invoice with normalized payload and resets to first page', async () => {
    render(createElement(Harness, { claimId: 'claim-id-1' }))

    act(() => {
      latest?.formDialog.onOpenCreate()
      latest?.formDialog.onFieldChange('invoiceNumber', ' INV-NEW-001 ')
      latest?.formDialog.onFieldChange('providerName', ' Provider New ')
      latest?.formDialog.onFieldChange('amountSubmitted', ' 123,45 ')
      latest?.pagination.onNextPage()
    })

    await act(async () => {
      await latest?.formDialog.onSubmit()
    })

    expect(createInvoice).toHaveBeenCalledTimes(1)
    expect(createInvoice).toHaveBeenCalledWith({
      invoiceNumber: 'INV-NEW-001',
      providerName: 'Provider New',
      amountSubmitted: '123.45',
    })
    expect(toastSuccessMock).toHaveBeenCalledWith('Factura creada')
    expect(latest?.pagination.page).toBe(1)
    expect(latest?.formDialog.open).toBe(false)
  })

  it('shows form error and blocks create mutation for invalid payload', async () => {
    render(createElement(Harness, { claimId: 'claim-id-1' }))

    act(() => {
      latest?.formDialog.onOpenCreate()
      latest?.formDialog.onFieldChange('invoiceNumber', '')
      latest?.formDialog.onFieldChange('providerName', '')
      latest?.formDialog.onFieldChange('amountSubmitted', 'abc')
    })

    await act(async () => {
      await latest?.formDialog.onSubmit()
    })

    expect(createInvoice).not.toHaveBeenCalled()
    expect(latest?.formDialog.error).toBeDefined()
  })

  it('updates invoice with partial patch only for changed fields', async () => {
    render(createElement(Harness, { claimId: 'claim-id-1' }))

    act(() => {
      latest?.formDialog.onOpenEdit('a0000000-0000-4000-8000-000000000011')
      latest?.formDialog.onFieldChange('providerName', 'Provider Updated')
    })

    await act(async () => {
      await latest?.formDialog.onSubmit()
    })

    expect(updateInvoice).toHaveBeenCalledTimes(1)
    expect(updateInvoice).toHaveBeenCalledWith({
      invoiceId: 'a0000000-0000-4000-8000-000000000011',
      input: { providerName: 'Provider Updated' },
    })
    expect(toastSuccessMock).toHaveBeenCalledWith('Factura actualizada')
  })

  it('skips update mutation when decimal value is equivalent', async () => {
    render(createElement(Harness, { claimId: 'claim-id-1' }))

    act(() => {
      latest?.formDialog.onOpenEdit('a0000000-0000-4000-8000-000000000011')
      latest?.formDialog.onFieldChange('amountSubmitted', '30.50')
    })

    await act(async () => {
      await latest?.formDialog.onSubmit()
    })

    expect(updateInvoice).not.toHaveBeenCalled()
    expect(latest?.formDialog.open).toBe(false)
  })

  it('deletes selected invoice and closes delete dialog', async () => {
    render(createElement(Harness, { claimId: 'claim-id-1' }))

    act(() => {
      latest?.deleteDialog.onOpenDelete('a0000000-0000-4000-8000-000000000012')
    })

    await act(async () => {
      await latest?.deleteDialog.onConfirmDelete()
    })

    expect(deleteInvoice).toHaveBeenCalledTimes(1)
    expect(deleteInvoice).toHaveBeenCalledWith(
      'a0000000-0000-4000-8000-000000000012',
    )
    expect(toastSuccessMock).toHaveBeenCalledWith('Factura eliminada')
    expect(latest?.deleteDialog.open).toBe(false)
  })

  it('resets dialog and pagination state when claim id changes', async () => {
    const { rerender } = render(createElement(Harness, { claimId: 'claim-id-1' }))

    invoicesResponse = makeInvoicesResponse({
      meta: {
        page: 1,
        limit: 20,
        totalCount: 60,
        totalPages: 3,
      },
    })

    rerender(createElement(Harness, { claimId: 'claim-id-1' }))

    act(() => {
      latest?.formDialog.onOpenCreate()
      latest?.pagination.onNextPage()
      latest?.deleteDialog.onOpenDelete('a0000000-0000-4000-8000-000000000011')
    })

    expect(latest?.formDialog.open).toBe(true)
    expect(latest?.deleteDialog.open).toBe(true)
    expect(latest?.pagination.page).toBe(2)

    rerender(createElement(Harness, { claimId: 'claim-id-2' }))

    expect(latest?.formDialog.open).toBe(false)
    expect(latest?.deleteDialog.open).toBe(false)
    expect(latest?.pagination.page).toBe(1)
    expect(latest?.pagination.limit).toBe(20)
  })
})
