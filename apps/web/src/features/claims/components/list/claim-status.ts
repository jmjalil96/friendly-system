import {
  CLAIM_TERMINAL_STATUSES,
  claimStatusSchema,
  type ClaimStatus,
} from '@friendly-system/shared'

const TERMINAL_CLAIM_STATUS_SET = new Set<ClaimStatus>(
  CLAIM_TERMINAL_STATUSES,
)

export const CLAIM_STATUS_OPTIONS = [
  ...claimStatusSchema.options,
] as readonly ClaimStatus[]

export const NON_TERMINAL_CLAIM_STATUSES = CLAIM_STATUS_OPTIONS.filter(
  (status) => !TERMINAL_CLAIM_STATUS_SET.has(status),
) as readonly ClaimStatus[]

export const CLAIM_STATUS_LABELS = {
  DRAFT: 'Borrador',
  SUBMITTED: 'Enviado',
  IN_REVIEW: 'En revisión',
  PENDING_INFO: 'Información pendiente',
  RETURNED: 'Devuelto',
  CANCELLED: 'Cancelado',
  SETTLED: 'Liquidado',
} as const satisfies Record<ClaimStatus, string>

export const CLAIM_STATUS_BADGE_CLASSNAMES = {
  DRAFT: 'bg-[var(--color-gray-100)] text-[var(--color-gray-600)]',
  SUBMITTED: 'bg-[var(--color-blue-50)] text-[var(--color-blue-700)]',
  IN_REVIEW: 'bg-[var(--color-amber-50)] text-[var(--color-amber-600)]',
  PENDING_INFO: 'bg-[var(--color-amber-50)] text-[var(--color-amber-600)]',
  RETURNED: 'bg-[var(--color-red-50)] text-[var(--color-red-700)]',
  CANCELLED: 'bg-[var(--color-red-50)] text-[var(--color-red-700)]',
  SETTLED: 'bg-[var(--color-green-50)] text-[var(--color-green-600)]',
} as const satisfies Record<ClaimStatus, string>
