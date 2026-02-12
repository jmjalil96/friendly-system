import { GitBranch } from 'lucide-react'
import type { ClaimStatus } from '@friendly-system/shared'
import { Button } from '@/shared/ui/primitives/button'
import { WorkflowCard, type WorkflowStepItem } from '@/shared/ui/composites/workflow-card'
import { CLAIM_STATUS_LABELS } from '@/features/claims/model/claims.status'
import type { ClaimWorkflowAction } from '@/features/claims/detail/controller/use-claim-workflow-controller'
import { ClaimTransitionDialog } from './claim-transition-dialog'

export interface ClaimWorkflowCardProps {
  fromStatus: ClaimStatus
  steps: WorkflowStepItem[]
  actions: ClaimWorkflowAction[]
  dialog: {
    open: boolean
    action?: ClaimWorkflowAction
    reason: string
    notes: string
    error?: string
    isSubmitting: boolean
  }
  onActionSelect: (toStatus: ClaimStatus) => void
  onDialogOpenChange: (open: boolean) => void
  onReasonChange: (value: string) => void
  onNotesChange: (value: string) => void
  onSubmitTransition: () => void | Promise<void>
}

export function ClaimWorkflowCard({
  fromStatus,
  steps,
  actions,
  dialog,
  onActionSelect,
  onDialogOpenChange,
  onReasonChange,
  onNotesChange,
  onSubmitTransition,
}: ClaimWorkflowCardProps) {
  const footer = (
    <div className="space-y-2">
      <p className="text-xs font-semibold tracking-wide text-[var(--color-gray-500)] uppercase">
        Acciones
      </p>

      {actions.length === 0 ? (
        <p className="text-sm text-[var(--color-gray-500)]">
          No hay transiciones disponibles para este estado.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {actions.map((action) => (
            <Button
              key={action.toStatus}
              type="button"
              size="sm"
              variant="outline"
              disabled={dialog.isSubmitting}
              onClick={() => onActionSelect(action.toStatus)}
            >
              {action.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  )

  return (
    <>
      <WorkflowCard
        title="Flujo"
        icon={<GitBranch className="size-4 text-[var(--color-blue-700)]" />}
        steps={steps}
        footer={footer}
      />

      {dialog.action ? (
        <ClaimTransitionDialog
          open={dialog.open}
          onOpenChange={onDialogOpenChange}
          fromStatusLabel={CLAIM_STATUS_LABELS[fromStatus]}
          toStatusLabel={CLAIM_STATUS_LABELS[dialog.action.toStatus]}
          reasonRequired={dialog.action.requiresReason}
          reason={dialog.reason}
          notes={dialog.notes}
          error={dialog.error}
          isSubmitting={dialog.isSubmitting}
          onReasonChange={onReasonChange}
          onNotesChange={onNotesChange}
          onSubmit={onSubmitTransition}
        />
      ) : null}
    </>
  )
}
