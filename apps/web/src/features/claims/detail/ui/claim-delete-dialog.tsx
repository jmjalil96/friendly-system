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

export interface ClaimDeleteDialogProps {
  open: boolean
  claimNumber?: number
  isDeleting: boolean
  onOpenChange: (open: boolean) => void
  onConfirmDelete: () => void | Promise<void>
}

export function ClaimDeleteDialog({
  open,
  claimNumber,
  isDeleting,
  onOpenChange,
  onConfirmDelete,
}: ClaimDeleteDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={!isDeleting}>
        <DialogHeader>
          <DialogTitle>Eliminar reclamo</DialogTitle>
          <DialogDescription>
            Esta acción no se puede deshacer. Se eliminará el reclamo{' '}
            <strong>#{claimNumber ?? 'seleccionado'}</strong> y su información
            asociada.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isDeleting}
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            disabled={isDeleting}
            onClick={() => void onConfirmDelete()}
          >
            {isDeleting ? <Loader2 className="size-3.5 animate-spin" /> : null}
            {isDeleting ? 'Eliminando...' : 'Eliminar reclamo'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
