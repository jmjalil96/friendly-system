import {
  POLICY_TERMINAL_STATUSES,
  policyStatusSchema,
  type PolicyStatus,
} from '@friendly-system/shared'

const TERMINAL_POLICY_STATUS_SET = new Set<PolicyStatus>(
  POLICY_TERMINAL_STATUSES,
)
const STATUS = policyStatusSchema.enum

export const POLICY_STATUS_OPTIONS = [
  ...policyStatusSchema.options,
] as readonly PolicyStatus[]

export const NON_TERMINAL_POLICY_STATUSES = POLICY_STATUS_OPTIONS.filter(
  (status) => !TERMINAL_POLICY_STATUS_SET.has(status),
) as readonly PolicyStatus[]

export const POLICY_STATUS_LABELS = {
  PENDING: 'Pendiente',
  ACTIVE: 'Activa',
  SUSPENDED: 'Suspendida',
  EXPIRED: 'Expirada',
  CANCELLED: 'Cancelada',
} as const satisfies Record<PolicyStatus, string>

export const POLICY_STATUS_BADGE_CLASSNAMES = {
  PENDING: 'bg-[var(--color-gray-100)] text-[var(--color-gray-600)]',
  ACTIVE: 'bg-[var(--color-green-50)] text-[var(--color-green-700)]',
  SUSPENDED: 'bg-[var(--color-amber-50)] text-[var(--color-amber-700)]',
  EXPIRED: 'bg-[var(--color-red-50)] text-[var(--color-red-700)]',
  CANCELLED: 'bg-[var(--color-red-50)] text-[var(--color-red-700)]',
} as const satisfies Record<PolicyStatus, string>

export const POLICY_WORKFLOW_STATUS_ORDER = [
  STATUS.PENDING,
  STATUS.ACTIVE,
  STATUS.SUSPENDED,
  STATUS.EXPIRED,
  STATUS.CANCELLED,
] as const satisfies readonly PolicyStatus[]
