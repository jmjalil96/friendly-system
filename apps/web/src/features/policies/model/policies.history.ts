import {
  policyStatusSchema,
  type PolicyTimelineResponse,
} from '@friendly-system/shared'
import { POLICY_STATUS_LABELS } from './policies.status'

export type PolicyTimelineAction =
  PolicyTimelineResponse['data'][number]['action']

export const POLICY_TIMELINE_ACTION_LABELS = {
  'policy.created': 'Póliza creada',
  'policy.updated': 'Póliza actualizada',
  'policy.transitioned': 'Estado transicionado',
  'policy.deleted': 'Póliza eliminada',
} as const satisfies Record<PolicyTimelineAction, string>

export const POLICY_TIMELINE_ACTION_TONE_CLASSNAMES = {
  'policy.created': 'bg-[var(--color-green-50)] text-[var(--color-green-700)]',
  'policy.updated': 'bg-[var(--color-blue-50)] text-[var(--color-blue-700)]',
  'policy.transitioned':
    'bg-[var(--color-amber-50)] text-[var(--color-amber-700)]',
  'policy.deleted': 'bg-[var(--color-red-50)] text-[var(--color-red-700)]',
} as const satisfies Record<PolicyTimelineAction, string>

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function toNonEmptyString(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []

  return value
    .map((item) => toNonEmptyString(item))
    .filter((item): item is string => item !== null)
}

function toPolicyStatusLabel(value: unknown): string | null {
  const parsed = policyStatusSchema.safeParse(value)
  if (!parsed.success) return null

  return POLICY_STATUS_LABELS[parsed.data]
}

function getUpdatedMetadataLines(metadata: unknown): string[] {
  if (!isObjectRecord(metadata)) return []
  const changedFields = toStringArray(metadata.changedFields)
  if (changedFields.length === 0) return []

  return [
    `Campos actualizados (${changedFields.length}): ${changedFields.join(', ')}`,
  ]
}

function getTransitionedMetadataLines(metadata: unknown): string[] {
  if (!isObjectRecord(metadata)) return []
  const lines: string[] = []

  const fromStatusLabel = toPolicyStatusLabel(metadata.fromStatus)
  const toStatusLabel = toPolicyStatusLabel(metadata.toStatus)
  if (fromStatusLabel && toStatusLabel) {
    lines.push(`Transición: ${fromStatusLabel} -> ${toStatusLabel}`)
  }

  const reason = toNonEmptyString(metadata.reason)
  if (reason) lines.push(`Motivo: ${reason}`)

  return lines
}

export function getPolicyTimelineMetadataLines(
  action: PolicyTimelineAction,
  metadata: unknown,
): string[] {
  const lines =
    action === 'policy.updated'
      ? getUpdatedMetadataLines(metadata)
      : action === 'policy.transitioned'
        ? getTransitionedMetadataLines(metadata)
        : []

  return lines.length > 0 ? lines : ['Evento registrado']
}
