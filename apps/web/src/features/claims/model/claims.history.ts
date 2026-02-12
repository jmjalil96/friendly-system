import {
  claimStatusSchema,
  type ClaimTimelineResponse,
} from '@friendly-system/shared'
import { CLAIM_STATUS_LABELS } from './claims.status'

export type ClaimTimelineAction = ClaimTimelineResponse['data'][number]['action']

export const CLAIM_TIMELINE_ACTION_LABELS = {
  'claim.created': 'Reclamo creado',
  'claim.updated': 'Reclamo actualizado',
  'claim.transitioned': 'Estado transicionado',
  'claim.deleted': 'Reclamo eliminado',
  'claim.invoice_created': 'Factura creada',
  'claim.invoice_updated': 'Factura actualizada',
  'claim.invoice_deleted': 'Factura eliminada',
} as const satisfies Record<ClaimTimelineAction, string>

export const CLAIM_TIMELINE_ACTION_TONE_CLASSNAMES = {
  'claim.created': 'bg-[var(--color-green-50)] text-[var(--color-green-700)]',
  'claim.updated': 'bg-[var(--color-blue-50)] text-[var(--color-blue-700)]',
  'claim.transitioned': 'bg-[var(--color-amber-50)] text-[var(--color-amber-700)]',
  'claim.deleted': 'bg-[var(--color-red-50)] text-[var(--color-red-700)]',
  'claim.invoice_created': 'bg-[var(--color-blue-50)] text-[var(--color-blue-700)]',
  'claim.invoice_updated': 'bg-[var(--color-blue-50)] text-[var(--color-blue-700)]',
  'claim.invoice_deleted': 'bg-[var(--color-red-50)] text-[var(--color-red-700)]',
} as const satisfies Record<ClaimTimelineAction, string>

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

function toClaimStatusLabel(value: unknown): string | null {
  const parsed = claimStatusSchema.safeParse(value)
  if (!parsed.success) return null

  return CLAIM_STATUS_LABELS[parsed.data]
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

  const fromStatusLabel = toClaimStatusLabel(metadata.fromStatus)
  const toStatusLabel = toClaimStatusLabel(metadata.toStatus)
  if (fromStatusLabel && toStatusLabel) {
    lines.push(`Transición: ${fromStatusLabel} -> ${toStatusLabel}`)
  }

  const reason = toNonEmptyString(metadata.reason)
  if (reason) lines.push(`Motivo: ${reason}`)

  return lines
}

function getInvoiceMetadataLines(metadata: unknown): string[] {
  if (!isObjectRecord(metadata)) return []

  const invoiceNumber = toNonEmptyString(metadata.invoiceNumber)
  if (invoiceNumber) return [`Factura: ${invoiceNumber}`]

  const invoiceId = toNonEmptyString(metadata.invoiceId)
  if (invoiceId) return [`Factura ID: ${invoiceId}`]

  return []
}

export function getClaimTimelineMetadataLines(
  action: ClaimTimelineAction,
  metadata: unknown,
): string[] {
  const lines =
    action === 'claim.updated'
      ? getUpdatedMetadataLines(metadata)
      : action === 'claim.transitioned'
        ? getTransitionedMetadataLines(metadata)
        : action === 'claim.invoice_created' ||
            action === 'claim.invoice_updated' ||
            action === 'claim.invoice_deleted'
          ? getInvoiceMetadataLines(metadata)
          : []

  return lines.length > 0 ? lines : ['Evento registrado']
}
