import { z } from 'zod'
import {
  policyStatusSchema,
  type PolicyStatus,
} from '../schemas/policies.schemas.js'

export const policyEditableFieldSchema = z.enum([
  'clientId',
  'insurerId',
  'policyNumber',
  'type',
  'planName',
  'employeeClass',
  'startDate',
  'endDate',
  'ambulatoryCoinsurancePct',
  'hospitalaryCoinsurancePct',
  'maternityCost',
  'tPremium',
  'tplus1Premium',
  'tplusfPremium',
  'benefitsCostPerPerson',
  'maxCoverage',
  'deductible',
])

export type PolicyEditableField = z.infer<typeof policyEditableFieldSchema>

const STATUS = policyStatusSchema.enum

export const POLICY_FIELD_GROUPS = {
  core: [
    'clientId',
    'insurerId',
    'policyNumber',
    'type',
    'planName',
    'employeeClass',
    'startDate',
    'endDate',
  ],
  financial: [
    'ambulatoryCoinsurancePct',
    'hospitalaryCoinsurancePct',
    'maternityCost',
    'tPremium',
    'tplus1Premium',
    'tplusfPremium',
    'benefitsCostPerPerson',
    'maxCoverage',
    'deductible',
  ],
} as const satisfies Record<string, readonly PolicyEditableField[]>

export const POLICY_TRANSITIONS: Record<PolicyStatus, readonly PolicyStatus[]> =
  {
    PENDING: [STATUS.ACTIVE, STATUS.CANCELLED],
    ACTIVE: [STATUS.SUSPENDED, STATUS.EXPIRED, STATUS.CANCELLED],
    SUSPENDED: [STATUS.ACTIVE, STATUS.EXPIRED, STATUS.CANCELLED],
    EXPIRED: [],
    CANCELLED: [],
  }

export const POLICY_TERMINAL_STATUSES: readonly PolicyStatus[] = [
  STATUS.EXPIRED,
  STATUS.CANCELLED,
]

export const POLICY_EDITABLE_FIELDS: Record<
  PolicyStatus,
  readonly PolicyEditableField[]
> = {
  PENDING: [...POLICY_FIELD_GROUPS.core, ...POLICY_FIELD_GROUPS.financial],
  ACTIVE: ['endDate', ...POLICY_FIELD_GROUPS.financial],
  SUSPENDED: ['endDate', ...POLICY_FIELD_GROUPS.financial],
  EXPIRED: [],
  CANCELLED: [],
}

export const POLICY_INVARIANTS: Record<
  PolicyStatus,
  readonly PolicyEditableField[]
> = {
  PENDING: [],
  ACTIVE: [
    'clientId',
    'insurerId',
    'policyNumber',
    'startDate',
    'endDate',
    'planName',
    'employeeClass',
    'maxCoverage',
    'deductible',
  ],
  SUSPENDED: [
    'clientId',
    'insurerId',
    'policyNumber',
    'startDate',
    'endDate',
    'planName',
    'employeeClass',
    'maxCoverage',
    'deductible',
  ],
  EXPIRED: [
    'clientId',
    'insurerId',
    'policyNumber',
    'startDate',
    'endDate',
    'planName',
    'employeeClass',
    'maxCoverage',
    'deductible',
  ],
  CANCELLED: [],
}

const REASON_REQUIRED_TRANSITIONS: readonly string[] = [
  'ACTIVE->SUSPENDED',
  'SUSPENDED->ACTIVE',
  '*->CANCELLED',
]

export const isPolicyTerminal = (status: PolicyStatus): boolean =>
  POLICY_TERMINAL_STATUSES.includes(status)

export const getPolicyEditableFields = (
  status: PolicyStatus,
): readonly PolicyEditableField[] => POLICY_EDITABLE_FIELDS[status]

export const getPolicyInvariants = (
  status: PolicyStatus,
): readonly PolicyEditableField[] => POLICY_INVARIANTS[status]

export const canPolicyTransition = (
  from: PolicyStatus,
  to: PolicyStatus,
): boolean => POLICY_TRANSITIONS[from].includes(to)

export const getAllowedPolicyTransitions = (
  status: PolicyStatus,
): readonly PolicyStatus[] => POLICY_TRANSITIONS[status]

export const isPolicyReasonRequired = (
  from: PolicyStatus,
  to: PolicyStatus,
): boolean => {
  const key = `${from}->${to}`
  if (REASON_REQUIRED_TRANSITIONS.includes(key)) return true
  return REASON_REQUIRED_TRANSITIONS.includes(`*->${to}`)
}
