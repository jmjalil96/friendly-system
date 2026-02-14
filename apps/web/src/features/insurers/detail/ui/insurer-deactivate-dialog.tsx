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

export interface InsurerDeactivateDialogProps {
  open: boolean
  insurerName?: string
  isDeactivating: boolean
  onOpenChange: (open: boolean) => void
  onConfirmDeactivate: () => void | Promise<void>
}

export function InsurerDeactivateDialog({
  open,
  insurerName,
  isDeactivating,
  onOpenChange,
  onConfirmDeactivate,
}: InsurerDeactivateDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={!isDeactivating}>
        <DialogHeader>
          <DialogTitle>Desactivar aseguradora</DialogTitle>
          <DialogDescription>
            Esta acción marca la aseguradora como inactiva y conserva sus datos.
            Aseguradora: <strong>{insurerName ?? 'seleccionada'}</strong>.
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
            {isDeactivating ? 'Desactivando...' : 'Desactivar aseguradora'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
