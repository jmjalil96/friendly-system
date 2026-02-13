// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { ClaimInvoiceFormDialog } from '@/features/claims/detail/ui/invoices/claim-invoice-form-dialog'

describe('ClaimInvoiceFormDialog', () => {
  const onOpenChange = vi.fn()
  const onFieldChange = vi.fn()
  const onSubmit = vi.fn()

  beforeEach(() => {
    onOpenChange.mockReset()
    onFieldChange.mockReset()
    onSubmit.mockReset()
  })

  afterEach(() => {
    cleanup()
  })

  it('renders create mode labels and form fields', () => {
    render(
      <ClaimInvoiceFormDialog
        open
        mode="create"
        draft={{
          invoiceNumber: '',
          providerName: '',
          amountSubmitted: '',
        }}
        isSubmitting={false}
        onOpenChange={onOpenChange}
        onFieldChange={onFieldChange}
        onSubmit={onSubmit}
      />,
    )

    expect(
      screen.queryByRole('heading', { name: 'Nueva factura' }),
    ).not.toBeNull()
    expect(screen.queryByLabelText('Número de factura')).not.toBeNull()
    expect(screen.queryByLabelText('Prestador')).not.toBeNull()
    expect(screen.queryByLabelText('Monto presentado')).not.toBeNull()
    expect(
      screen.queryByRole('button', { name: 'Guardar factura' }),
    ).not.toBeNull()
  })

  it('forwards field change and submit callbacks', () => {
    render(
      <ClaimInvoiceFormDialog
        open
        mode="edit"
        draft={{
          invoiceNumber: 'INV-001',
          providerName: 'Provider One',
          amountSubmitted: '30.50',
        }}
        isSubmitting={false}
        onOpenChange={onOpenChange}
        onFieldChange={onFieldChange}
        onSubmit={onSubmit}
      />,
    )

    fireEvent.change(screen.getByLabelText('Número de factura'), {
      target: { value: 'INV-002' },
    })
    fireEvent.change(screen.getByLabelText('Prestador'), {
      target: { value: 'Provider Two' },
    })
    fireEvent.change(screen.getByLabelText('Monto presentado'), {
      target: { value: '45.00' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Actualizar factura' }))

    expect(onFieldChange).toHaveBeenCalledTimes(3)
    expect(onFieldChange).toHaveBeenNthCalledWith(1, 'invoiceNumber', 'INV-002')
    expect(onFieldChange).toHaveBeenNthCalledWith(
      2,
      'providerName',
      'Provider Two',
    )
    expect(onFieldChange).toHaveBeenNthCalledWith(3, 'amountSubmitted', '45.00')
    expect(onSubmit).toHaveBeenCalledTimes(1)
  })

  it('disables actions while submitting', () => {
    render(
      <ClaimInvoiceFormDialog
        open
        mode="edit"
        draft={{
          invoiceNumber: 'INV-001',
          providerName: 'Provider One',
          amountSubmitted: '30.50',
        }}
        isSubmitting
        onOpenChange={onOpenChange}
        onFieldChange={onFieldChange}
        onSubmit={onSubmit}
      />,
    )

    expect(
      (screen.getByRole('button', { name: 'Cancelar' }) as HTMLButtonElement)
        .disabled,
    ).toBe(true)
    expect(
      (
        screen.getByRole('button', {
          name: 'Actualizando...',
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true)
  })
})
