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
import { CLAIMS_PRIMARY_ACTION_BUTTON_CLASSNAME } from '@/features/claims/model/claims.ui-tokens'

interface SubmitClaimConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void | Promise<void>
  isSubmitting: boolean
  canSubmit: boolean
}

export function SubmitClaimConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  isSubmitting,
  canSubmit,
}: SubmitClaimConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={!isSubmitting}>
        <DialogHeader>
          <DialogTitle>Confirmar creación del reclamo</DialogTitle>
          <DialogDescription>
            Se creará el reclamo con la información cargada. ¿Deseas continuar?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            className="min-w-[8rem]"
          >
            Cancelar
          </Button>
          <Button
            size="sm"
            onClick={() => void onConfirm()}
            disabled={!canSubmit || isSubmitting}
            className={`min-w-[9.5rem] ${CLAIMS_PRIMARY_ACTION_BUTTON_CLASSNAME}`}
          >
            {isSubmitting ? <Loader2 className="animate-spin" /> : null}
            {isSubmitting ? 'Creando...' : 'Confirmar y crear'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
