import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  getPolicyEditableFields,
  updatePolicySchema,
  type GetPolicyByIdResponse,
  type PolicyEditableField,
  type PolicyType,
  type UpdatePolicyInput,
} from '@friendly-system/shared'
import {
  POLICY_STATUS_BADGE_CLASSNAMES,
  POLICY_STATUS_LABELS,
} from '@/features/policies/model/policies.status'
import { POLICIES_INLINE_SAVE_BUTTON_CLASSNAME } from '@/features/policies/model/policies.ui-tokens'
import { POLICIES_SEARCH_DEBOUNCE_MS } from '@/features/policies/model/policies.constants'
import {
  formatPolicyDateOnly,
  formatPolicyDateTime,
} from '@/features/policies/model/policies.formatters'
import {
  dayFirstDateToIso,
  isIsoDate,
  isoDateToDayFirst,
} from '@/shared/lib/date-format'
import { useDebouncedValue } from '@/shared/hooks/use-debounced-value'
import { toast } from '@/shared/hooks/use-toast'
import type {
  InlineEditFieldOption,
  InlineEditFieldProps,
  InlineEditFieldVariant,
} from '@/shared/ui/composites/inline-edit-field'
import {
  useLookupPolicyClients,
  useLookupPolicyInsurers,
  useUpdatePolicy,
} from '@/features/policies/api/policies.hooks'

type DetailFieldKey = PolicyEditableField

interface FieldDefinition {
  key: DetailFieldKey
  label: string
  variant: InlineEditFieldVariant
  nullable: boolean
  placeholder?: string
  options?: readonly InlineEditFieldOption[]
}

interface SectionDefinition {
  key: 'core' | 'financial'
  title: string
  subtitle: string
  fields: readonly FieldDefinition[]
}

export interface PolicyDetailMainSection {
  key: SectionDefinition['key']
  title: string
  subtitle: string
  fields: InlineEditFieldProps[]
}

export interface PolicyDetailSummaryItem {
  label: string
  value: string
}

export interface UsePolicyDetailMainControllerParams {
  policyId: string
  policy?: GetPolicyByIdResponse
}

export interface UsePolicyDetailMainControllerResult {
  sections: PolicyDetailMainSection[]
  summary: {
    statusLabel?: string
    statusClassName?: string
    items: PolicyDetailSummaryItem[]
  }
}

const DECIMAL_FIELDS = new Set<DetailFieldKey>([
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

const DATE_FIELDS = new Set<DetailFieldKey>(['startDate', 'endDate'])
const NULLABLE_TEXT_FIELDS = new Set<DetailFieldKey>([
  'planName',
  'employeeClass',
])
const INVALID_DATE_INPUT_MESSAGE = 'Fecha invalida. Usa DD/MM/AAAA.'

const POLICY_TYPE_LABELS = {
  HEALTH: 'Salud',
  LIFE: 'Vida',
  ACCIDENTS: 'Accidentes',
} as const satisfies Record<Exclude<PolicyType, null>, string>

const POLICY_TYPE_VALUES = ['HEALTH', 'LIFE', 'ACCIDENTS'] as const

const POLICY_TYPE_OPTIONS = POLICY_TYPE_VALUES.map((value) => ({
  value,
  label: POLICY_TYPE_LABELS[value],
})) as readonly InlineEditFieldOption[]

const SECTION_DEFINITIONS = [
  {
    key: 'core',
    title: 'Datos principales',
    subtitle: 'Identificación y vigencia de la póliza',
    fields: [
      {
        key: 'policyNumber',
        label: 'Número',
        variant: 'text',
        nullable: false,
      },
      {
        key: 'clientId',
        label: 'Cliente',
        variant: 'async-combobox',
        nullable: false,
        placeholder: 'Seleccionar cliente...',
      },
      {
        key: 'insurerId',
        label: 'Aseguradora',
        variant: 'async-combobox',
        nullable: false,
        placeholder: 'Seleccionar aseguradora...',
      },
      {
        key: 'type',
        label: 'Tipo',
        variant: 'select',
        nullable: true,
        options: POLICY_TYPE_OPTIONS,
      },
      {
        key: 'planName',
        label: 'Nombre del plan',
        variant: 'text',
        nullable: true,
        placeholder: 'Sin plan',
      },
      {
        key: 'employeeClass',
        label: 'Clase de empleado',
        variant: 'text',
        nullable: true,
        placeholder: 'Sin clase',
      },
      {
        key: 'startDate',
        label: 'Inicio',
        variant: 'date',
        nullable: false,
      },
      {
        key: 'endDate',
        label: 'Fin',
        variant: 'date',
        nullable: false,
      },
    ],
  },
  {
    key: 'financial',
    title: 'Condiciones económicas',
    subtitle: 'Costos y porcentajes de cobertura',
    fields: [
      {
        key: 'ambulatoryCoinsurancePct',
        label: '% Coaseguro ambulatorio',
        variant: 'decimal',
        nullable: true,
        placeholder: '0.00',
      },
      {
        key: 'hospitalaryCoinsurancePct',
        label: '% Coaseguro hospitalario',
        variant: 'decimal',
        nullable: true,
        placeholder: '0.00',
      },
      {
        key: 'maternityCost',
        label: 'Costo maternidad',
        variant: 'decimal',
        nullable: true,
        placeholder: '0.00',
      },
      {
        key: 'tPremium',
        label: 'Prima titular',
        variant: 'decimal',
        nullable: true,
        placeholder: '0.00',
      },
      {
        key: 'tplus1Premium',
        label: 'Prima titular +1',
        variant: 'decimal',
        nullable: true,
        placeholder: '0.00',
      },
      {
        key: 'tplusfPremium',
        label: 'Prima titular + familia',
        variant: 'decimal',
        nullable: true,
        placeholder: '0.00',
      },
      {
        key: 'benefitsCostPerPerson',
        label: 'Costo por persona',
        variant: 'decimal',
        nullable: true,
        placeholder: '0.00',
      },
      {
        key: 'maxCoverage',
        label: 'Cobertura máxima',
        variant: 'decimal',
        nullable: true,
        placeholder: '0.00',
      },
      {
        key: 'deductible',
        label: 'Deducible',
        variant: 'decimal',
        nullable: true,
        placeholder: '0.00',
      },
    ],
  },
] as const satisfies readonly SectionDefinition[]

function formatDecimal(value: string): string {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return value

  return numeric.toLocaleString('es', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function formatType(value: string | null): string {
  if (!value) return 'Sin tipo'
  return POLICY_TYPE_LABELS[value as Exclude<PolicyType, null>] ?? value
}

function getFieldRawValue(
  policy: GetPolicyByIdResponse,
  field: DetailFieldKey,
): string | null {
  if (field === 'clientId') return policy.clientId
  if (field === 'insurerId') return policy.insurerId
  if (field === 'policyNumber') return policy.policyNumber
  if (field === 'type') return policy.type
  if (field === 'startDate') return policy.startDate
  if (field === 'endDate') return policy.endDate
  return policy[field] ?? null
}

function getFieldDisplayValue(
  policy: GetPolicyByIdResponse,
  field: DetailFieldKey,
): string {
  if (field === 'clientId') return policy.clientName
  if (field === 'insurerId') return policy.insurerName

  const rawValue = getFieldRawValue(policy, field)
  if (rawValue === null || rawValue === '') return 'Sin dato'

  if (field === 'type') return formatType(rawValue)
  if (DATE_FIELDS.has(field)) return formatPolicyDateOnly(rawValue)
  if (DECIMAL_FIELDS.has(field)) return formatDecimal(rawValue)
  return rawValue
}

function normalizeDraftValue(
  field: DetailFieldKey,
  rawValue: string,
): string | null {
  const trimmed = rawValue.trim()

  if (trimmed === '') {
    if (field === 'type') return null
    if (DECIMAL_FIELDS.has(field)) return null
    if (NULLABLE_TEXT_FIELDS.has(field)) return null
    return ''
  }

  if (DECIMAL_FIELDS.has(field)) return trimmed.replace(/,/g, '.')

  return trimmed
}

function normalizeCurrentValue(
  field: DetailFieldKey,
  value: string | null,
): string | null {
  if (value === null) return null
  return normalizeDraftValue(field, value)
}

function getEditableDraftValue(
  field: DetailFieldKey,
  value: string | null,
): string {
  if (value === null) return ''
  if (DATE_FIELDS.has(field)) return isoDateToDayFirst(value)
  return value
}

function validateFieldPatchPayload(
  field: DetailFieldKey,
  value: string | null,
): { payload?: UpdatePolicyInput; error?: string } {
  let normalizedValue = value
  if (DATE_FIELDS.has(field) && value !== null) {
    normalizedValue = isIsoDate(value) ? value : dayFirstDateToIso(value)
    if (!normalizedValue) {
      return { error: INVALID_DATE_INPUT_MESSAGE }
    }
  }

  const payload = { [field]: normalizedValue } as UpdatePolicyInput
  const parsed = updatePolicySchema.safeParse(payload)

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? 'Valor inválido',
    }
  }

  return { payload: parsed.data }
}

function validateDateDraftValue(value: string | null): string | undefined {
  if (value === null) return undefined
  if (isIsoDate(value) || dayFirstDateToIso(value)) {
    return undefined
  }
  return INVALID_DATE_INPUT_MESSAGE
}

export function usePolicyDetailMainController({
  policyId,
  policy,
}: UsePolicyDetailMainControllerParams): UsePolicyDetailMainControllerResult {
  const { updatePolicy, updatePolicyStatus } = useUpdatePolicy(policyId)
  const isSaving = updatePolicyStatus === 'pending'

  const [activeField, setActiveField] = useState<DetailFieldKey | null>(null)
  const [draftValue, setDraftValue] = useState('')
  const [fieldError, setFieldError] = useState<string>()
  const [clientSearch, setClientSearch] = useState('')
  const [insurerSearch, setInsurerSearch] = useState('')
  const debouncedClientSearch = useDebouncedValue(
    clientSearch,
    POLICIES_SEARCH_DEBOUNCE_MS,
  )
  const debouncedInsurerSearch = useDebouncedValue(
    insurerSearch,
    POLICIES_SEARCH_DEBOUNCE_MS,
  )

  useEffect(() => {
    setActiveField(null)
    setDraftValue('')
    setFieldError(undefined)
    setClientSearch('')
    setInsurerSearch('')
  }, [policyId])

  const editableFieldSet = useMemo(
    () =>
      new Set<DetailFieldKey>(
        policy ? getPolicyEditableFields(policy.status) : [],
      ),
    [policy?.status],
  )

  const canEditField = useCallback(
    (field: DetailFieldKey): boolean => editableFieldSet.has(field),
    [editableFieldSet],
  )

  const isEditingClient = activeField === 'clientId'
  const isEditingInsurer = activeField === 'insurerId'

  const clientsLookupQuery = useLookupPolicyClients(
    isEditingClient && debouncedClientSearch.trim().length > 0
      ? { search: debouncedClientSearch, page: 1, limit: 20 }
      : { page: 1, limit: 100 },
  )

  const insurersLookupQuery = useLookupPolicyInsurers(
    isEditingInsurer && debouncedInsurerSearch.trim().length > 0
      ? { search: debouncedInsurerSearch, page: 1, limit: 20 }
      : { page: 1, limit: 100 },
  )

  const clientOptions = useMemo<InlineEditFieldOption[]>(
    () =>
      (clientsLookupQuery.data?.data ?? []).map((client) => ({
        value: client.id,
        label: client.name,
      })),
    [clientsLookupQuery.data?.data],
  )

  const insurerOptions = useMemo<InlineEditFieldOption[]>(
    () =>
      (insurersLookupQuery.data?.data ?? []).map((insurer) => ({
        value: insurer.id,
        label: insurer.name,
      })),
    [insurersLookupQuery.data?.data],
  )

  const startEdit = useCallback(
    (field: DetailFieldKey) => {
      if (!policy || isSaving || !canEditField(field)) return

      setActiveField(field)
      setFieldError(undefined)
      setDraftValue(
        getEditableDraftValue(field, getFieldRawValue(policy, field)),
      )
      if (field === 'clientId') setClientSearch('')
      if (field === 'insurerId') setInsurerSearch('')
    },
    [canEditField, isSaving, policy],
  )

  const cancelEdit = useCallback(
    (field: DetailFieldKey) => {
      if (activeField !== field) return
      setActiveField(null)
      setFieldError(undefined)
      setDraftValue('')
      setClientSearch('')
      setInsurerSearch('')
    },
    [activeField],
  )

  const changeDraft = useCallback(
    (field: DetailFieldKey, nextValue: string) => {
      if (activeField !== field) return
      setDraftValue(nextValue)
      if (fieldError) setFieldError(undefined)
    },
    [activeField, fieldError],
  )

  const blurDraft = useCallback(
    (field: DetailFieldKey) => {
      if (activeField !== field || !DATE_FIELDS.has(field)) return
      const normalizedValue = normalizeDraftValue(field, draftValue)
      setFieldError(validateDateDraftValue(normalizedValue))
    },
    [activeField, draftValue],
  )

  const saveField = useCallback(
    async (field: DetailFieldKey) => {
      if (!policy || isSaving || activeField !== field) return

      const nextValue = normalizeDraftValue(field, draftValue)
      const { payload, error } = validateFieldPatchPayload(field, nextValue)
      if (!payload) {
        setFieldError(error)
        return
      }

      const parsedNextValue = payload[field] ?? null
      const currentValue = normalizeCurrentValue(
        field,
        getFieldRawValue(policy, field),
      )
      const normalizedNextValue =
        parsedNextValue === null ? null : String(parsedNextValue)

      if (normalizedNextValue === currentValue) {
        setActiveField(null)
        setDraftValue('')
        setFieldError(undefined)
        setClientSearch('')
        setInsurerSearch('')
        return
      }

      try {
        await updatePolicy(payload)
        toast.success('Campo actualizado')
        setActiveField(null)
        setDraftValue('')
        setFieldError(undefined)
        setClientSearch('')
        setInsurerSearch('')
      } catch {
        // API errors are already handled globally.
      }
    },
    [activeField, draftValue, isSaving, policy, updatePolicy],
  )

  const sections = useMemo<PolicyDetailMainSection[]>(() => {
    if (!policy) return []

    return SECTION_DEFINITIONS.map((section) => ({
      key: section.key,
      title: section.title,
      subtitle: section.subtitle,
      fields: section.fields.map((field): InlineEditFieldProps => {
        const isFieldEditing = activeField === field.key
        const rawValue = getFieldRawValue(policy, field.key)
        const displayValue = getFieldDisplayValue(policy, field.key)

        return {
          label: field.label,
          displayValue,
          variant: field.variant,
          nullable: field.nullable,
          placeholder: 'placeholder' in field ? field.placeholder : undefined,
          editable: canEditField(field.key),
          isEditing: isFieldEditing,
          isSaving,
          draftValue: isFieldEditing
            ? draftValue
            : getEditableDraftValue(field.key, rawValue),
          error: isFieldEditing ? fieldError : undefined,
          saveButtonClassName: POLICIES_INLINE_SAVE_BUTTON_CLASSNAME,
          options:
            field.key === 'clientId'
              ? clientOptions
              : field.key === 'insurerId'
                ? insurerOptions
                : 'options' in field
                  ? field.options
                  : undefined,
          optionsLoading:
            field.key === 'clientId'
              ? clientsLookupQuery.isFetching
              : field.key === 'insurerId'
                ? insurersLookupQuery.isFetching
                : false,
          optionsSearch:
            field.key === 'clientId'
              ? clientSearch
              : field.key === 'insurerId'
                ? insurerSearch
                : undefined,
          onOptionsSearchChange:
            field.key === 'clientId'
              ? setClientSearch
              : field.key === 'insurerId'
                ? setInsurerSearch
                : undefined,
          onStartEdit: () => startEdit(field.key),
          onCancel: () => cancelEdit(field.key),
          onSave: () => saveField(field.key),
          onDraftChange: (nextValue) => changeDraft(field.key, nextValue),
          onDraftBlur: () => blurDraft(field.key),
        }
      }),
    }))
  }, [
    policy,
    activeField,
    canEditField,
    isSaving,
    draftValue,
    fieldError,
    clientOptions,
    insurerOptions,
    clientsLookupQuery.isFetching,
    insurersLookupQuery.isFetching,
    clientSearch,
    insurerSearch,
    startEdit,
    cancelEdit,
    saveField,
    changeDraft,
    blurDraft,
  ])

  const summary = useMemo(() => {
    if (!policy) return { items: [] as PolicyDetailSummaryItem[] }

    const items: PolicyDetailSummaryItem[] = [
      { label: 'Número', value: policy.policyNumber },
      { label: 'Cliente', value: policy.clientName },
      { label: 'Aseguradora', value: policy.insurerName },
      { label: 'Tipo', value: formatType(policy.type) },
      {
        label: 'Vigencia',
        value: `${formatPolicyDateOnly(policy.startDate)} - ${formatPolicyDateOnly(policy.endDate)}`,
      },
      {
        label: 'Actualizado',
        value: formatPolicyDateTime(policy.updatedAt, 'datetime'),
      },
    ]

    if (policy.cancellationReason) {
      items.push({
        label: 'Motivo de cancelación',
        value: policy.cancellationReason,
      })
    }

    return {
      statusLabel: POLICY_STATUS_LABELS[policy.status],
      statusClassName: POLICY_STATUS_BADGE_CLASSNAMES[policy.status],
      items,
    }
  }, [policy])

  return { sections, summary }
}
