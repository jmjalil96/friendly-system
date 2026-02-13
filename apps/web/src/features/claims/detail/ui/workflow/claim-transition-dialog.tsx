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
import { Textarea } from '@/shared/ui/primitives/textarea'
import { CLAIMS_INLINE_SAVE_BUTTON_CLASSNAME } from '@/features/claims/model/claims.ui-tokens'

export interface ClaimTransitionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  fromStatusLabel: string
  toStatusLabel: string
  reasonRequired: boolean
  reason: string
  notes: string
  error?: string
  isSubmitting: boolean
  onReasonChange: (value: string) => void
  onNotesChange: (value: string) => void
  onSubmit: () => void | Promise<void>
}

export function ClaimTransitionDialog({
  open,
  onOpenChange,
  fromStatusLabel,
  toStatusLabel,
  reasonRequired,
  reason,
  notes,
  error,
  isSubmitting,
  onReasonChange,
  onNotesChange,
  onSubmit,
}: ClaimTransitionDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={!isSubmitting}>
        <DialogHeader>
          <DialogTitle>Confirmar transición</DialogTitle>
          <DialogDescription>
            El estado cambiará de <strong>{fromStatusLabel}</strong> a{' '}
            <strong>{toStatusLabel}</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <label
              htmlFor="claim-transition-reason"
              className="text-xs font-semibold tracking-wide text-[var(--color-gray-600)] uppercase"
            >
              Motivo {reasonRequired ? '(requerido)' : '(opcional)'}
            </label>
            <Input
              id="claim-transition-reason"
              value={reason}
              disabled={isSubmitting}
              onChange={(event) => onReasonChange(event.target.value)}
              placeholder="Ingresa el motivo de la transición"
              required={reasonRequired}
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="claim-transition-notes"
              className="text-xs font-semibold tracking-wide text-[var(--color-gray-600)] uppercase"
            >
              Notas (opcional)
            </label>
            <Textarea
              id="claim-transition-notes"
              rows={4}
              value={notes}
              disabled={isSubmitting}
              onChange={(event) => onNotesChange(event.target.value)}
              placeholder="Agrega notas para contextualizar la transición"
              className="min-h-[7rem]"
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
            {isSubmitting ? 'Actualizando...' : 'Confirmar transición'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
