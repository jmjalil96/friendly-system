import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  CLAIM_TERMINAL_STATUSES,
  getAllowedClaimTransitions,
  isClaimReasonRequired,
  transitionClaimSchema,
  type ClaimStatus,
  type GetClaimByIdResponse,
  type TransitionClaimInput,
} from '@friendly-system/shared'
import { toast } from '@/shared/hooks/use-toast'
import {
  CLAIM_STATUS_LABELS,
  CLAIM_WORKFLOW_STATUS_ORDER,
} from '@/features/claims/model/claims.status'
import type { WorkflowStepItem } from '@/shared/ui/composites/workflow-card'
import { useTransitionClaim } from '@/features/claims/api/claims.hooks'

export interface ClaimWorkflowAction {
  toStatus: ClaimStatus
  label: string
  requiresReason: boolean
}

export interface UseClaimWorkflowControllerParams {
  claimId: string
  claim?: GetClaimByIdResponse
}

export interface UseClaimWorkflowControllerResult {
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
  onSubmitTransition: () => Promise<void>
}

const TERMINAL_STATUS_SET = new Set<ClaimStatus>(CLAIM_TERMINAL_STATUSES)

function toWorkflowStepState(
  status: ClaimStatus,
  currentStatus: ClaimStatus,
  currentIndex: number,
  index: number,
): WorkflowStepItem['state'] {
  if (status === currentStatus) return 'current'
  if (TERMINAL_STATUS_SET.has(status)) return 'terminal'
  if (currentIndex >= 0 && index < currentIndex) return 'completed'
  return 'pending'
}

function buildTransitionPayload(
  toStatus: ClaimStatus,
  reason: string,
  notes: string,
): TransitionClaimInput {
  const payload: TransitionClaimInput = { status: toStatus }

  const normalizedReason = reason.trim()
  const normalizedNotes = notes.trim()

  if (normalizedReason.length > 0) payload.reason = normalizedReason
  if (normalizedNotes.length > 0) payload.notes = normalizedNotes

  return payload
}

export function useClaimWorkflowController({
  claimId,
  claim,
}: UseClaimWorkflowControllerParams): UseClaimWorkflowControllerResult {
  const { transitionClaim, transitionClaimStatus } = useTransitionClaim(claimId)
  const isSubmitting = transitionClaimStatus === 'pending'

  const [open, setOpen] = useState(false)
  const [selectedToStatus, setSelectedToStatus] = useState<ClaimStatus>()
  const [reason, setReason] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string>()

  useEffect(() => {
    setOpen(false)
    setSelectedToStatus(undefined)
    setReason('')
    setNotes('')
    setError(undefined)
  }, [claimId])

  const steps = useMemo<WorkflowStepItem[]>(() => {
    if (!claim) return []

    const currentIndex = CLAIM_WORKFLOW_STATUS_ORDER.indexOf(claim.status)

    return CLAIM_WORKFLOW_STATUS_ORDER.map((status, index) => {
      const state = toWorkflowStepState(
        status,
        claim.status,
        currentIndex,
        index,
      )

      return {
        id: status,
        label: CLAIM_STATUS_LABELS[status],
        state,
        metaText:
          state === 'current'
            ? 'Estado actual'
            : state === 'terminal'
              ? 'Estado terminal'
              : state === 'pending'
                ? 'Pendiente'
                : undefined,
      }
    })
  }, [claim])

  const actions = useMemo<ClaimWorkflowAction[]>(() => {
    if (!claim) return []

    return getAllowedClaimTransitions(claim.status).map((toStatus) => ({
      toStatus,
      label: `Cambiar a ${CLAIM_STATUS_LABELS[toStatus]}`,
      requiresReason: isClaimReasonRequired(claim.status, toStatus),
    }))
  }, [claim])

  const selectedAction = useMemo(
    () => actions.find((action) => action.toStatus === selectedToStatus),
    [actions, selectedToStatus],
  )

  const resetDialog = useCallback(() => {
    setOpen(false)
    setSelectedToStatus(undefined)
    setReason('')
    setNotes('')
    setError(undefined)
  }, [])

  const onActionSelect = useCallback((toStatus: ClaimStatus) => {
    setOpen(true)
    setSelectedToStatus(toStatus)
    setReason('')
    setNotes('')
    setError(undefined)
  }, [])

  const onDialogOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (isSubmitting && !nextOpen) return
      if (!nextOpen) {
        resetDialog()
        return
      }

      setOpen(true)
    },
    [isSubmitting, resetDialog],
  )

  const onReasonChange = useCallback(
    (value: string) => {
      setReason(value)
      if (error) setError(undefined)
    },
    [error],
  )

  const onNotesChange = useCallback(
    (value: string) => {
      setNotes(value)
      if (error) setError(undefined)
    },
    [error],
  )

  const onSubmitTransition = useCallback(async () => {
    if (!claim || !selectedAction || isSubmitting) return

    if (selectedAction.requiresReason && reason.trim().length === 0) {
      setError('Ingresa un motivo para continuar.')
      return
    }

    const payloadCandidate = buildTransitionPayload(
      selectedAction.toStatus,
      reason,
      notes,
    )
    const parsedPayload = transitionClaimSchema.safeParse(payloadCandidate)

    if (!parsedPayload.success) {
      setError(parsedPayload.error.issues[0]?.message ?? 'Valores inválidos')
      return
    }

    try {
      await transitionClaim(parsedPayload.data)
      toast.success('Estado actualizado')
      resetDialog()
    } catch {
      // API errors are already surfaced via global toast in api.ts.
    }
  }, [
    claim,
    isSubmitting,
    notes,
    reason,
    resetDialog,
    selectedAction,
    transitionClaim,
  ])

  return {
    steps,
    actions,
    dialog: {
      open,
      action: selectedAction,
      reason,
      notes,
      error,
      isSubmitting,
    },
    onActionSelect,
    onDialogOpenChange,
    onReasonChange,
    onNotesChange,
    onSubmitTransition,
  }
}
