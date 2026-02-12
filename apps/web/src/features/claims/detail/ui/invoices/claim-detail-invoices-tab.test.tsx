// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'

const useClaimInvoicesControllerMock = vi.hoisted(() => vi.fn())

vi.mock('@/features/claims/detail/controller/use-claim-invoices-controller', () => ({
  useClaimInvoicesController: useClaimInvoicesControllerMock,
}))

import { ClaimDetailInvoicesTab } from '@/features/claims/detail/ui/invoices/claim-detail-invoices-tab'

describe('ClaimDetailInvoicesTab', () => {
  const onRetry = vi.fn()
  const onOpenCreate = vi.fn()
  const onOpenEdit = vi.fn()
  const onOpenDelete = vi.fn()

  beforeEach(() => {
    onRetry.mockReset()
    onOpenCreate.mockReset()
    onOpenEdit.mockReset()
    onOpenDelete.mockReset()
  })

  afterEach(() => {
    cleanup()
  })

  it('renders loading skeleton state', () => {
    useClaimInvoicesControllerMock.mockReturnValue({
      list: {
        invoices: [],
        isLoading: true,
        isError: false,
        onRetry,
      },
      pagination: {
        page: 1,
        limit: 20,
        limitOptions: [10, 20, 50, 100],
        totalCount: 0,
        totalPages: 1,
        onFirstPage: vi.fn(),
        onPreviousPage: vi.fn(),
        onNextPage: vi.fn(),
        onLastPage: vi.fn(),
        onLimitChange: vi.fn(),
      },
      formDialog: {
        open: false,
        mode: 'create',
        draft: {
          invoiceNumber: '',
          providerName: '',
          amountSubmitted: '',
        },
        isSubmitting: false,
        onOpenCreate,
        onOpenEdit,
        onOpenChange: vi.fn(),
        onFieldChange: vi.fn(),
        onSubmit: vi.fn(),
      },
      deleteDialog: {
        open: false,
        invoice: undefined,
        isDeleting: false,
        onOpenDelete,
        onOpenChange: vi.fn(),
        onConfirmDelete: vi.fn(),
      },
    })

    const { container } = render(<ClaimDetailInvoicesTab claimId="claim-id-1" />)
    expect(container.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0)
  })

  it('renders error state and retries', () => {
    useClaimInvoicesControllerMock.mockReturnValue({
      list: {
        invoices: [],
        isLoading: false,
        isError: true,
        onRetry,
      },
      pagination: {
        page: 1,
        limit: 20,
        limitOptions: [10, 20, 50, 100],
        totalCount: 0,
        totalPages: 1,
        onFirstPage: vi.fn(),
        onPreviousPage: vi.fn(),
        onNextPage: vi.fn(),
        onLastPage: vi.fn(),
        onLimitChange: vi.fn(),
      },
      formDialog: {
        open: false,
        mode: 'create',
        draft: {
          invoiceNumber: '',
          providerName: '',
          amountSubmitted: '',
        },
        isSubmitting: false,
        onOpenCreate,
        onOpenEdit,
        onOpenChange: vi.fn(),
        onFieldChange: vi.fn(),
        onSubmit: vi.fn(),
      },
      deleteDialog: {
        open: false,
        invoice: undefined,
        isDeleting: false,
        onOpenDelete,
        onOpenChange: vi.fn(),
        onConfirmDelete: vi.fn(),
      },
    })

    render(<ClaimDetailInvoicesTab claimId="claim-id-1" />)
    fireEvent.click(screen.getByRole('button', { name: /Reintentar/i }))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('renders invoice list and delegates action callbacks', () => {
    useClaimInvoicesControllerMock.mockReturnValue({
      list: {
        invoices: [
          {
            id: 'invoice-id-1',
            claimId: 'claim-id-1',
            invoiceNumber: 'INV-001',
            providerName: 'Provider One',
            amountSubmitted: '30.50',
            createdById: 'user-id-1',
            createdAt: '2026-02-10T10:00:00.000Z',
          },
        ],
        isLoading: false,
        isError: false,
        onRetry,
      },
      pagination: {
        page: 1,
        limit: 20,
        limitOptions: [10, 20, 50, 100],
        totalCount: 1,
        totalPages: 1,
        onFirstPage: vi.fn(),
        onPreviousPage: vi.fn(),
        onNextPage: vi.fn(),
        onLastPage: vi.fn(),
        onLimitChange: vi.fn(),
      },
      formDialog: {
        open: false,
        mode: 'create',
        draft: {
          invoiceNumber: '',
          providerName: '',
          amountSubmitted: '',
        },
        isSubmitting: false,
        onOpenCreate,
        onOpenEdit,
        onOpenChange: vi.fn(),
        onFieldChange: vi.fn(),
        onSubmit: vi.fn(),
      },
      deleteDialog: {
        open: false,
        invoice: undefined,
        isDeleting: false,
        onOpenDelete,
        onOpenChange: vi.fn(),
        onConfirmDelete: vi.fn(),
      },
    })

    const { container } = render(<ClaimDetailInvoicesTab claimId="claim-id-1" />)

    expect(screen.queryByText('INV-001')).not.toBeNull()
    expect(screen.queryByText('Provider One')).not.toBeNull()
    expect(
      container.querySelector('[data-slot="claim-detail-invoices-scroll-hint"]'),
    ).not.toBeNull()
    expect(
      container.querySelector('[data-slot="claim-detail-invoices-scroll-fade"]'),
    ).not.toBeNull()

    const table = container.querySelector('[data-slot="table"]')
    const tableContainer = container.querySelector('[data-slot="table-container"]')
    expect(table?.className).toContain('min-w-[640px]')
    expect(tableContainer?.className).toContain('overflow-auto')
    expect(tableContainer?.className).toContain('[scrollbar-width:none]')

    fireEvent.click(screen.getByRole('button', { name: 'Nueva factura' }))
    fireEvent.click(screen.getByRole('button', { name: 'Editar' }))
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar' }))

    expect(onOpenCreate).toHaveBeenCalledTimes(1)
    expect(onOpenEdit).toHaveBeenCalledWith('invoice-id-1')
    expect(onOpenDelete).toHaveBeenCalledWith('invoice-id-1')
  })
})
