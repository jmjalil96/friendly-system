// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { ClaimInvoiceDeleteDialog } from '@/features/claims/detail/ui/invoices/claim-invoice-delete-dialog'

describe('ClaimInvoiceDeleteDialog', () => {
  const onOpenChange = vi.fn()
  const onConfirmDelete = vi.fn()

  beforeEach(() => {
    onOpenChange.mockReset()
    onConfirmDelete.mockReset()
  })

  afterEach(() => {
    cleanup()
  })

  it('renders invoice context in delete confirmation', () => {
    render(
      <ClaimInvoiceDeleteDialog
        open
        invoiceNumber="INV-001"
        providerName="Provider One"
        isDeleting={false}
        onOpenChange={onOpenChange}
        onConfirmDelete={onConfirmDelete}
      />,
    )

    expect(
      screen.queryByRole('heading', { name: 'Eliminar factura' }),
    ).not.toBeNull()
    expect(screen.queryByText('INV-001')).not.toBeNull()
    expect(screen.queryByText('Provider One')).not.toBeNull()
  })

  it('triggers delete confirmation callback', () => {
    render(
      <ClaimInvoiceDeleteDialog
        open
        invoiceNumber="INV-001"
        providerName="Provider One"
        isDeleting={false}
        onOpenChange={onOpenChange}
        onConfirmDelete={onConfirmDelete}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Eliminar factura' }))
    expect(onConfirmDelete).toHaveBeenCalledTimes(1)
  })

  it('disables controls while deleting', () => {
    render(
      <ClaimInvoiceDeleteDialog
        open
        invoiceNumber="INV-001"
        providerName="Provider One"
        isDeleting
        onOpenChange={onOpenChange}
        onConfirmDelete={onConfirmDelete}
      />,
    )

    expect(
      (screen.getByRole('button', { name: 'Cancelar' }) as HTMLButtonElement)
        .disabled,
    ).toBe(true)
    expect(
      (
        screen.getByRole('button', {
          name: 'Eliminando...',
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true)
  })
})
