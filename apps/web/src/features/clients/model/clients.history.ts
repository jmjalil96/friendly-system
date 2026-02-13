import type { ClientTimelineResponse } from '@friendly-system/shared'

export type ClientTimelineAction =
  ClientTimelineResponse['data'][number]['action']

export const CLIENT_TIMELINE_ACTION_LABELS = {
  'client.created': 'Cliente creado',
  'client.updated': 'Cliente actualizado',
  'client.deactivated': 'Cliente desactivado',
} as const satisfies Record<ClientTimelineAction, string>

export const CLIENT_TIMELINE_ACTION_TONE_CLASSNAMES = {
  'client.created': 'bg-[var(--color-green-50)] text-[var(--color-green-700)]',
  'client.updated': 'bg-[var(--color-blue-50)] text-[var(--color-blue-700)]',
  'client.deactivated':
    'bg-[var(--color-amber-50)] text-[var(--color-amber-700)]',
} as const satisfies Record<ClientTimelineAction, string>

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

function getUpdatedMetadataLines(metadata: unknown): string[] {
  if (!isObjectRecord(metadata)) return []
  const changedFields = toStringArray(metadata.changedFields)
  if (changedFields.length === 0) return []

  return [
    `Campos actualizados (${changedFields.length}): ${changedFields.join(', ')}`,
  ]
}

function getDeactivatedMetadataLines(metadata: unknown): string[] {
  if (!isObjectRecord(metadata)) return []

  const previousStatus = metadata.wasActive === true ? 'Activo' : 'Inactivo'
  return [`Estado previo: ${previousStatus}`]
}

export function getClientTimelineMetadataLines(
  action: ClientTimelineAction,
  metadata: unknown,
): string[] {
  const lines =
    action === 'client.updated'
      ? getUpdatedMetadataLines(metadata)
      : action === 'client.deactivated'
        ? getDeactivatedMetadataLines(metadata)
        : []

  return lines.length > 0 ? lines : ['Evento registrado']
}
