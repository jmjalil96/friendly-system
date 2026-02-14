import { GitBranch } from 'lucide-react'
import type { PolicyStatus } from '@friendly-system/shared'
import { Button } from '@/shared/ui/primitives/button'
import {
  WorkflowCard,
  type WorkflowStepItem,
} from '@/shared/ui/composites/workflow-card'
import { POLICY_STATUS_LABELS } from '@/features/policies/model/policies.status'
import type { PolicyWorkflowAction } from '@/features/policies/detail/controller/use-policy-workflow-controller'
import { PolicyTransitionDialog } from './policy-transition-dialog'

export interface PolicyWorkflowCardProps {
  fromStatus: PolicyStatus
  steps: WorkflowStepItem[]
  actions: PolicyWorkflowAction[]
  dialog: {
    open: boolean
    action?: PolicyWorkflowAction
    reason: string
    notes: string
    error?: string
    isSubmitting: boolean
  }
  onActionSelect: (toStatus: PolicyStatus) => void
  onDialogOpenChange: (open: boolean) => void
  onReasonChange: (value: string) => void
  onNotesChange: (value: string) => void
  onSubmitTransition: () => void | Promise<void>
}

export function PolicyWorkflowCard({
  fromStatus,
  steps,
  actions,
  dialog,
  onActionSelect,
  onDialogOpenChange,
  onReasonChange,
  onNotesChange,
  onSubmitTransition,
}: PolicyWorkflowCardProps) {
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
        <PolicyTransitionDialog
          open={dialog.open}
          onOpenChange={onDialogOpenChange}
          fromStatusLabel={POLICY_STATUS_LABELS[fromStatus]}
          toStatusLabel={POLICY_STATUS_LABELS[dialog.action.toStatus]}
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
