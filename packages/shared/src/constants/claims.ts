import { z } from 'zod'
import {
  claimStatusSchema,
  type ClaimStatus,
} from '../schemas/claims.schemas.js'

// ── Editable Field Names ────────────────────────────────────────────

export const claimEditableFieldSchema = z.enum([
  'policyId',
  'description',
  'careType',
  'diagnosis',
  'incidentDate',
  'amountSubmitted',
  'submittedDate',
  'amountApproved',
  'amountDenied',
  'amountUnprocessed',
  'deductibleApplied',
  'copayApplied',
  'settlementDate',
  'settlementNumber',
  'settlementNotes',
])

export type ClaimEditableField = z.infer<typeof claimEditableFieldSchema>

// ── Status Values ───────────────────────────────────────────────────

const STATUS = claimStatusSchema.enum

// ── Field Groups ────────────────────────────────────────────────────

export const CLAIM_FIELD_GROUPS = {
  core: ['policyId', 'description', 'careType', 'diagnosis', 'incidentDate'],
  submission: ['amountSubmitted', 'submittedDate'],
  settlement: [
    'amountApproved',
    'amountDenied',
    'amountUnprocessed',
    'deductibleApplied',
    'copayApplied',
    'settlementDate',
    'settlementNumber',
    'settlementNotes',
  ],
} as const satisfies Record<string, readonly ClaimEditableField[]>

// ── Transitions ─────────────────────────────────────────────────────

export const CLAIM_TRANSITIONS: Record<ClaimStatus, readonly ClaimStatus[]> = {
  DRAFT: [STATUS.IN_REVIEW, STATUS.CANCELLED],
  IN_REVIEW: [STATUS.SUBMITTED, STATUS.RETURNED, STATUS.CANCELLED],
  SUBMITTED: [STATUS.PENDING_INFO, STATUS.SETTLED, STATUS.CANCELLED],
  PENDING_INFO: [STATUS.SUBMITTED, STATUS.CANCELLED],
  RETURNED: [],
  SETTLED: [],
  CANCELLED: [],
}

export const CLAIM_TERMINAL_STATUSES: readonly ClaimStatus[] = [
  STATUS.RETURNED,
  STATUS.SETTLED,
  STATUS.CANCELLED,
]

// ── Editable Fields by Status ───────────────────────────────────────

export const CLAIM_EDITABLE_FIELDS: Record<
  ClaimStatus,
  readonly ClaimEditableField[]
> = {
  DRAFT: CLAIM_FIELD_GROUPS.core,
  IN_REVIEW: [...CLAIM_FIELD_GROUPS.core, ...CLAIM_FIELD_GROUPS.submission],
  SUBMITTED: CLAIM_FIELD_GROUPS.settlement,
  PENDING_INFO: [],
  RETURNED: [],
  SETTLED: [],
  CANCELLED: [],
}

// ── Invariants (required fields before entering a status) ───────────

export const CLAIM_INVARIANTS: Record<
  ClaimStatus,
  readonly ClaimEditableField[]
> = {
  DRAFT: [],
  IN_REVIEW: CLAIM_FIELD_GROUPS.core,
  SUBMITTED: [...CLAIM_FIELD_GROUPS.core, ...CLAIM_FIELD_GROUPS.submission],
  PENDING_INFO: [...CLAIM_FIELD_GROUPS.core, ...CLAIM_FIELD_GROUPS.submission],
  RETURNED: CLAIM_FIELD_GROUPS.core,
  SETTLED: [
    ...CLAIM_FIELD_GROUPS.core,
    ...CLAIM_FIELD_GROUPS.submission,
    ...CLAIM_FIELD_GROUPS.settlement,
  ],
  CANCELLED: [],
}

// ── Transition Reason Requirements ──────────────────────────────────

const REASON_REQUIRED_TRANSITIONS: readonly string[] = [
  'IN_REVIEW->RETURNED',
  'SUBMITTED->PENDING_INFO',
  'PENDING_INFO->SUBMITTED',
  '*->CANCELLED',
]

// ── Helper Functions ────────────────────────────────────────────────

export const isClaimTerminal = (status: ClaimStatus): boolean =>
  CLAIM_TERMINAL_STATUSES.includes(status)

export const getClaimEditableFields = (
  status: ClaimStatus,
): readonly ClaimEditableField[] => CLAIM_EDITABLE_FIELDS[status]

export const getClaimInvariants = (
  status: ClaimStatus,
): readonly ClaimEditableField[] => CLAIM_INVARIANTS[status]

export const canClaimTransition = (
  from: ClaimStatus,
  to: ClaimStatus,
): boolean => CLAIM_TRANSITIONS[from].includes(to)

export const getAllowedClaimTransitions = (
  status: ClaimStatus,
): readonly ClaimStatus[] => CLAIM_TRANSITIONS[status]

export const isClaimReasonRequired = (
  from: ClaimStatus,
  to: ClaimStatus,
): boolean => {
  const key = `${from}->${to}`
  if (REASON_REQUIRED_TRANSITIONS.includes(key)) return true
  return REASON_REQUIRED_TRANSITIONS.includes(`*->${to}`)
}
