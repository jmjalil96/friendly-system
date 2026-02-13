import { Loader2 } from 'lucide-react'
import { Button } from '@/shared/ui/primitives/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/primitives/dialog'
import { Input } from '@/shared/ui/primitives/input'
import { CLAIMS_INLINE_SAVE_BUTTON_CLASSNAME } from '@/features/claims/model/claims.ui-tokens'

export interface ClaimInvoiceFormDraft {
  invoiceNumber: string
  providerName: string
  amountSubmitted: string
}

export interface ClaimInvoiceFormDialogProps {
  open: boolean
  mode: 'create' | 'edit'
  draft: ClaimInvoiceFormDraft
  error?: string
  isSubmitting: boolean
  onOpenChange: (open: boolean) => void
  onFieldChange: (field: keyof ClaimInvoiceFormDraft, value: string) => void
  onSubmit: () => void | Promise<void>
}

export function ClaimInvoiceFormDialog({
  open,
  mode,
  draft,
  error,
  isSubmitting,
  onOpenChange,
  onFieldChange,
  onSubmit,
}: ClaimInvoiceFormDialogProps) {
  const isCreate = mode === 'create'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={!isSubmitting}>
        <DialogHeader>
          <DialogTitle>
            {isCreate ? 'Nueva factura' : 'Editar factura'}
          </DialogTitle>
          <DialogDescription>
            {isCreate
              ? 'Registra una factura vinculada a este reclamo.'
              : 'Actualiza la información de la factura seleccionada.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <label
              htmlFor="claim-invoice-number"
              className="text-xs font-semibold tracking-wide text-[var(--color-gray-600)] uppercase"
            >
              Número de factura
            </label>
            <Input
              id="claim-invoice-number"
              value={draft.invoiceNumber}
              disabled={isSubmitting}
              onChange={(event) =>
                onFieldChange('invoiceNumber', event.target.value)
              }
              placeholder="Ej. INV-2026-001"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="claim-invoice-provider-name"
              className="text-xs font-semibold tracking-wide text-[var(--color-gray-600)] uppercase"
            >
              Prestador
            </label>
            <Input
              id="claim-invoice-provider-name"
              value={draft.providerName}
              disabled={isSubmitting}
              onChange={(event) =>
                onFieldChange('providerName', event.target.value)
              }
              placeholder="Ej. Clínica Central"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="claim-invoice-amount-submitted"
              className="text-xs font-semibold tracking-wide text-[var(--color-gray-600)] uppercase"
            >
              Monto presentado
            </label>
            <Input
              id="claim-invoice-amount-submitted"
              value={draft.amountSubmitted}
              disabled={isSubmitting}
              onChange={(event) =>
                onFieldChange('amountSubmitted', event.target.value)
              }
              placeholder="0.00"
              inputMode="decimal"
              className="tabular-nums"
            />
          </div>

          {error ? (
            <p className="text-sm text-[var(--color-red-600)]">{error}</p>
          ) : null}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => void onSubmit()}
            disabled={isSubmitting}
            className={CLAIMS_INLINE_SAVE_BUTTON_CLASSNAME}
          >
            {isSubmitting ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : null}
            {isSubmitting
              ? isCreate
                ? 'Guardando...'
                : 'Actualizando...'
              : isCreate
                ? 'Guardar factura'
                : 'Actualizar factura'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
