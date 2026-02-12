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

export interface ClaimInvoiceDeleteDialogProps {
  open: boolean
  invoiceNumber?: string
  providerName?: string
  isDeleting: boolean
  onOpenChange: (open: boolean) => void
  onConfirmDelete: () => void | Promise<void>
}

export function ClaimInvoiceDeleteDialog({
  open,
  invoiceNumber,
  providerName,
  isDeleting,
  onOpenChange,
  onConfirmDelete,
}: ClaimInvoiceDeleteDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={!isDeleting}>
        <DialogHeader>
          <DialogTitle>Eliminar factura</DialogTitle>
          <DialogDescription>
            Esta acción no se puede deshacer. Se eliminará la factura{' '}
            <strong>{invoiceNumber ?? 'seleccionada'}</strong>
            {providerName ? (
              <>
                {' '}
                del prestador <strong>{providerName}</strong>
              </>
            ) : null}
            .
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={() => void onConfirmDelete()}
            disabled={isDeleting}
          >
            {isDeleting ? <Loader2 className="size-3.5 animate-spin" /> : null}
            {isDeleting ? 'Eliminando...' : 'Eliminar factura'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
