import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  POLICY_TERMINAL_STATUSES,
  getAllowedPolicyTransitions,
  isPolicyReasonRequired,
  transitionPolicySchema,
  type PolicyStatus,
  type GetPolicyByIdResponse,
  type TransitionPolicyInput,
} from '@friendly-system/shared'
import { toast } from '@/shared/hooks/use-toast'
import {
  POLICY_STATUS_LABELS,
  POLICY_WORKFLOW_STATUS_ORDER,
} from '@/features/policies/model/policies.status'
import type { WorkflowStepItem } from '@/shared/ui/composites/workflow-card'
import { useTransitionPolicy } from '@/features/policies/api/policies.hooks'

export interface PolicyWorkflowAction {
  toStatus: PolicyStatus
  label: string
  requiresReason: boolean
}

export interface UsePolicyWorkflowControllerParams {
  policyId: string
  policy?: GetPolicyByIdResponse
}

export interface UsePolicyWorkflowControllerResult {
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
  onSubmitTransition: () => Promise<void>
}

const TERMINAL_STATUS_SET = new Set<PolicyStatus>(POLICY_TERMINAL_STATUSES)

function toWorkflowStepState(
  status: PolicyStatus,
  currentStatus: PolicyStatus,
  currentIndex: number,
  index: number,
): WorkflowStepItem['state'] {
  if (status === currentStatus) return 'current'
  if (TERMINAL_STATUS_SET.has(status)) return 'terminal'
  if (currentIndex >= 0 && index < currentIndex) return 'completed'
  return 'pending'
}

function buildTransitionPayload(
  toStatus: PolicyStatus,
  reason: string,
  notes: string,
): TransitionPolicyInput {
  const payload: TransitionPolicyInput = { status: toStatus }

  const normalizedReason = reason.trim()
  const normalizedNotes = notes.trim()

  if (normalizedReason.length > 0) payload.reason = normalizedReason
  if (normalizedNotes.length > 0) payload.notes = normalizedNotes

  return payload
}

export function usePolicyWorkflowController({
  policyId,
  policy,
}: UsePolicyWorkflowControllerParams): UsePolicyWorkflowControllerResult {
  const { transitionPolicy, transitionPolicyStatus } =
    useTransitionPolicy(policyId)
  const isSubmitting = transitionPolicyStatus === 'pending'

  const [open, setOpen] = useState(false)
  const [selectedToStatus, setSelectedToStatus] = useState<PolicyStatus>()
  const [reason, setReason] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string>()

  useEffect(() => {
    setOpen(false)
    setSelectedToStatus(undefined)
    setReason('')
    setNotes('')
    setError(undefined)
  }, [policyId])

  const steps = useMemo<WorkflowStepItem[]>(() => {
    if (!policy) return []

    const currentIndex = POLICY_WORKFLOW_STATUS_ORDER.indexOf(policy.status)

    return POLICY_WORKFLOW_STATUS_ORDER.map((status, index) => {
      const state = toWorkflowStepState(
        status,
        policy.status,
        currentIndex,
        index,
      )

      return {
        id: status,
        label: POLICY_STATUS_LABELS[status],
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
  }, [policy])

  const actions = useMemo<PolicyWorkflowAction[]>(() => {
    if (!policy) return []

    return getAllowedPolicyTransitions(policy.status).map((toStatus) => ({
      toStatus,
      label: `Cambiar a ${POLICY_STATUS_LABELS[toStatus]}`,
      requiresReason: isPolicyReasonRequired(policy.status, toStatus),
    }))
  }, [policy])

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

  const onActionSelect = useCallback((toStatus: PolicyStatus) => {
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
    if (!policy || !selectedAction || isSubmitting) return

    if (selectedAction.requiresReason && reason.trim().length === 0) {
      setError('Ingresa un motivo para continuar.')
      return
    }

    const payloadCandidate = buildTransitionPayload(
      selectedAction.toStatus,
      reason,
      notes,
    )
    const parsedPayload = transitionPolicySchema.safeParse(payloadCandidate)

    if (!parsedPayload.success) {
      setError(parsedPayload.error.issues[0]?.message ?? 'Valores inválidos')
      return
    }

    try {
      await transitionPolicy(parsedPayload.data)
      toast.success('Estado actualizado')
      resetDialog()
    } catch {
      // API errors are already surfaced via global toast in api.ts.
    }
  }, [
    policy,
    isSubmitting,
    notes,
    reason,
    resetDialog,
    selectedAction,
    transitionPolicy,
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
