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

export interface ClientDeactivateDialogProps {
  open: boolean
  clientName?: string
  isDeactivating: boolean
  onOpenChange: (open: boolean) => void
  onConfirmDeactivate: () => void | Promise<void>
}

export function ClientDeactivateDialog({
  open,
  clientName,
  isDeactivating,
  onOpenChange,
  onConfirmDeactivate,
}: ClientDeactivateDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={!isDeactivating}>
        <DialogHeader>
          <DialogTitle>Desactivar cliente</DialogTitle>
          <DialogDescription>
            Esta acción marca el cliente como inactivo y conserva sus datos.
            Cliente: <strong>{clientName ?? 'seleccionado'}</strong>.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isDeactivating}
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            disabled={isDeactivating}
            onClick={() => void onConfirmDeactivate()}
          >
            {isDeactivating ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : null}
            {isDeactivating ? 'Desactivando...' : 'Desactivar cliente'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
