import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  careTypeSchema,
  getClaimEditableFields,
  updateClaimSchema,
  type CareType,
  type ClaimEditableField,
  type GetClaimByIdResponse,
  type UpdateClaimInput,
} from '@friendly-system/shared'
import {
  CLAIM_STATUS_BADGE_CLASSNAMES,
  CLAIM_STATUS_LABELS,
} from '@/features/claims/model/claims.status'
import { CLAIMS_INLINE_SAVE_BUTTON_CLASSNAME } from '@/features/claims/model/claims.ui-tokens'
import { CLAIMS_SEARCH_DEBOUNCE_MS } from '@/features/claims/model/claims.constants'
import {
  formatClaimDateOnly,
  formatClaimDateTime,
} from '@/features/claims/model/claims.formatters'
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
import { useLookupClientPolicies, useUpdateClaim } from '@/features/claims/api/claims.hooks'

type DetailFieldKey = ClaimEditableField

interface FieldDefinition {
  key: DetailFieldKey
  label: string
  variant: InlineEditFieldVariant
  nullable: boolean
  placeholder?: string
  options?: readonly InlineEditFieldOption[]
}

interface SectionDefinition {
  key: 'core' | 'submission' | 'settlement'
  title: string
  subtitle: string
  fields: readonly FieldDefinition[]
}

export interface ClaimDetailMainSection {
  key: SectionDefinition['key']
  title: string
  subtitle: string
  fields: InlineEditFieldProps[]
}

export interface ClaimDetailSummaryItem {
  label: string
  value: string
}

export interface UseClaimDetailMainControllerParams {
  claimId: string
  claim?: GetClaimByIdResponse
}

export interface UseClaimDetailMainControllerResult {
  sections: ClaimDetailMainSection[]
  summary: {
    statusLabel?: string
    statusClassName?: string
    items: ClaimDetailSummaryItem[]
  }
}

const DECIMAL_FIELDS = new Set<DetailFieldKey>([
  'amountSubmitted',
  'amountApproved',
  'amountDenied',
  'amountUnprocessed',
  'deductibleApplied',
  'copayApplied',
])

const DATE_FIELDS = new Set<DetailFieldKey>([
  'incidentDate',
  'submittedDate',
  'settlementDate',
])
const INVALID_DATE_INPUT_MESSAGE = 'Fecha invalida. Usa DD/MM/AAAA.'

const CARE_TYPE_LABELS = {
  AMBULATORY: 'Ambulatorio',
  HOSPITALARY: 'Hospitalario',
  OTHER: 'Otro',
} as const satisfies Record<CareType, string>

const CARE_TYPE_OPTIONS = careTypeSchema.options.map((value) => ({
  value,
  label: CARE_TYPE_LABELS[value],
})) as readonly InlineEditFieldOption[]

const SECTION_DEFINITIONS = [
  {
    key: 'core',
    title: 'Datos principales',
    subtitle: 'Informacion base del reclamo y contexto clinico',
    fields: [
      {
        key: 'policyId',
        label: 'Poliza',
        variant: 'async-combobox',
        nullable: true,
        placeholder: 'Seleccionar poliza...',
      },
      {
        key: 'careType',
        label: 'Tipo de atencion',
        variant: 'select',
        nullable: true,
        options: CARE_TYPE_OPTIONS,
      },
      {
        key: 'incidentDate',
        label: 'Fecha de incidente',
        variant: 'date',
        nullable: true,
      },
      {
        key: 'diagnosis',
        label: 'Diagnostico',
        variant: 'text',
        nullable: true,
        placeholder: 'Ej. Lesion muscular',
      },
      {
        key: 'description',
        label: 'Descripcion',
        variant: 'textarea',
        nullable: false,
        placeholder: 'Describe el reclamo de forma clara...',
      },
    ],
  },
  {
    key: 'submission',
    title: 'Presentacion',
    subtitle: 'Datos de presentacion inicial ante la aseguradora',
    fields: [
      {
        key: 'amountSubmitted',
        label: 'Monto presentado',
        variant: 'decimal',
        nullable: true,
        placeholder: '0.00',
      },
      {
        key: 'submittedDate',
        label: 'Fecha de presentacion',
        variant: 'date',
        nullable: true,
      },
    ],
  },
  {
    key: 'settlement',
    title: 'Liquidacion',
    subtitle: 'Resultado economico y datos de liquidacion',
    fields: [
      {
        key: 'amountApproved',
        label: 'Monto aprobado',
        variant: 'decimal',
        nullable: true,
        placeholder: '0.00',
      },
      {
        key: 'amountDenied',
        label: 'Monto rechazado',
        variant: 'decimal',
        nullable: true,
        placeholder: '0.00',
      },
      {
        key: 'amountUnprocessed',
        label: 'Monto sin procesar',
        variant: 'decimal',
        nullable: true,
        placeholder: '0.00',
      },
      {
        key: 'deductibleApplied',
        label: 'Deducible aplicado',
        variant: 'decimal',
        nullable: true,
        placeholder: '0.00',
      },
      {
        key: 'copayApplied',
        label: 'Copago aplicado',
        variant: 'decimal',
        nullable: true,
        placeholder: '0.00',
      },
      {
        key: 'settlementDate',
        label: 'Fecha de liquidacion',
        variant: 'date',
        nullable: true,
      },
      {
        key: 'settlementNumber',
        label: 'Nro. de liquidacion',
        variant: 'text',
        nullable: true,
        placeholder: 'Ej. LIQ-2026-001',
      },
      {
        key: 'settlementNotes',
        label: 'Notas de liquidacion',
        variant: 'textarea',
        nullable: true,
        placeholder: 'Comentarios adicionales de liquidacion...',
      },
    ],
  },
] as const satisfies readonly SectionDefinition[]

function formatFullName(firstName?: string, lastName?: string): string | null {
  if (!firstName && !lastName) return null
  return `${firstName ?? ''} ${lastName ?? ''}`.trim()
}

function formatPolicyLabel(
  policyNumber: string | null,
  policyInsurerName: string | null,
): string | null {
  if (!policyNumber) return null
  if (!policyInsurerName) return policyNumber
  return `${policyNumber} · ${policyInsurerName}`
}

function formatDecimal(value: string): string {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return value

  return numeric.toLocaleString('es', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function formatFieldValue(field: DetailFieldKey, value: string | null): string {
  if (value === null || value === '') return 'Sin dato'

  if (field === 'careType') {
    return CARE_TYPE_LABELS[value as CareType] ?? value
  }

  if (DATE_FIELDS.has(field)) return formatClaimDateOnly(value)
  if (DECIMAL_FIELDS.has(field)) return formatDecimal(value)

  return value
}

function normalizeDraftValue(field: DetailFieldKey, rawValue: string): string | null {
  const trimmed = rawValue.trim()
  if (trimmed === '') return field === 'description' ? '' : null

  if (DECIMAL_FIELDS.has(field)) {
    return trimmed.replace(/,/g, '.')
  }

  return trimmed
}

function getEditableDraftValue(field: DetailFieldKey, value: string | null): string {
  if (value === null) return ''
  if (DATE_FIELDS.has(field)) return isoDateToDayFirst(value)
  return value
}

function normalizeCurrentValue(
  field: DetailFieldKey,
  value: string | null,
): string | null {
  if (value === null) return null
  return normalizeDraftValue(field, value)
}

function getFieldValue(
  claim: GetClaimByIdResponse,
  field: DetailFieldKey,
): string | null {
  const value = claim[field]
  return typeof value === 'string' ? value : null
}

function validateFieldPatchPayload(
  field: DetailFieldKey,
  value: string | null,
): { payload?: UpdateClaimInput; error?: string } {
  let normalizedValue = value
  if (DATE_FIELDS.has(field) && value !== null) {
    normalizedValue = isIsoDate(value) ? value : dayFirstDateToIso(value)
    if (!normalizedValue) {
      return {
        error: INVALID_DATE_INPUT_MESSAGE,
      }
    }
  }

  const payload = { [field]: normalizedValue } as UpdateClaimInput
  const parsed = updateClaimSchema.safeParse(payload)

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? 'Invalid value',
    }
  }

  return {
    payload: parsed.data,
  }
}

function validateDateDraftValue(value: string | null): string | undefined {
  if (value === null) return undefined

  if (isIsoDate(value) || dayFirstDateToIso(value)) {
    return undefined
  }

  return INVALID_DATE_INPUT_MESSAGE
}

export function useClaimDetailMainController({
  claimId,
  claim,
}: UseClaimDetailMainControllerParams): UseClaimDetailMainControllerResult {
  const { updateClaim, updateClaimStatus } = useUpdateClaim(claimId)
  const isSaving = updateClaimStatus === 'pending'

  const [activeField, setActiveField] = useState<DetailFieldKey | null>(null)
  const [draftValue, setDraftValue] = useState('')
  const [fieldError, setFieldError] = useState<string>()
  const [policySearch, setPolicySearch] = useState('')
  const debouncedPolicySearch = useDebouncedValue(
    policySearch,
    CLAIMS_SEARCH_DEBOUNCE_MS,
  )

  useEffect(() => {
    setActiveField(null)
    setDraftValue('')
    setFieldError(undefined)
    setPolicySearch('')
  }, [claimId])

  const editableFieldSet = useMemo(
    () =>
      new Set<DetailFieldKey>(
        claim ? getClaimEditableFields(claim.status) : [],
      ),
    [claim?.status],
  )

  const canEditField = useCallback(
    (field: DetailFieldKey): boolean => editableFieldSet.has(field),
    [editableFieldSet],
  )

  const isEditingPolicy = activeField === 'policyId'
  const shouldSearchPolicies =
    isEditingPolicy && debouncedPolicySearch.trim().length > 0

  const policyLookupQuery = useLookupClientPolicies(
    isEditingPolicy ? (claim?.clientId ?? '') : '',
    shouldSearchPolicies
      ? { search: debouncedPolicySearch, page: 1, limit: 20 }
      : { page: 1, limit: 100 },
  )

  const policyOptions = useMemo<InlineEditFieldOption[]>(
    () =>
      (policyLookupQuery.data?.data ?? []).map((policy) => ({
        value: policy.id,
        label: `${policy.policyNumber} · ${policy.insurerName}`,
      })),
    [policyLookupQuery.data?.data],
  )

  const startEdit = useCallback(
    (field: DetailFieldKey) => {
      if (!claim || isSaving || !canEditField(field)) return

      setActiveField(field)
      setFieldError(undefined)
      setDraftValue(getEditableDraftValue(field, getFieldValue(claim, field)))
      if (field === 'policyId') setPolicySearch('')
    },
    [canEditField, claim, isSaving],
  )

  const cancelEdit = useCallback(
    (field: DetailFieldKey) => {
      if (activeField !== field) return
      setActiveField(null)
      setFieldError(undefined)
      setDraftValue('')
      setPolicySearch('')
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
      if (!claim || isSaving || activeField !== field) return

      const nextValue = normalizeDraftValue(field, draftValue)
      const { payload, error } = validateFieldPatchPayload(field, nextValue)
      if (!payload) {
        setFieldError(error)
        return
      }

      const parsedNextValue = payload[field] ?? null

      const currentValue = normalizeCurrentValue(
        field,
        getFieldValue(claim, field),
      )

      if (parsedNextValue === currentValue) {
        cancelEdit(field)
        return
      }

      try {
        await updateClaim(payload)
        toast.success('Campo actualizado')
        cancelEdit(field)
      } catch {
        // API errors are already surfaced via global toast in api.ts.
      }
    },
    [activeField, cancelEdit, claim, draftValue, isSaving, updateClaim],
  )

  const sections = useMemo<ClaimDetailMainSection[]>(() => {
    if (!claim) return []

    return SECTION_DEFINITIONS.map((section) => ({
      key: section.key,
      title: section.title,
      subtitle: section.subtitle,
      fields: section.fields.map((definition) => {
        const field = definition.key
        const isEditing = activeField === field
        const value = getFieldValue(claim, field)
        const policyOption = policyOptions.find((option) => option.value === value)
        const policyLabel = formatPolicyLabel(
          claim.policyNumber,
          claim.policyInsurerName,
        )
        const displayValue =
          field === 'policyId' && policyOption
            ? policyOption.label
            : field === 'policyId' && policyLabel
              ? policyLabel
            : formatFieldValue(field, value)

        return {
          label: definition.label,
          displayValue,
          variant: definition.variant,
          editable: canEditField(field),
          isEditing,
          isSaving,
          draftValue: isEditing ? draftValue : getEditableDraftValue(field, value),
          saveButtonClassName: CLAIMS_INLINE_SAVE_BUTTON_CLASSNAME,
          placeholder:
            'placeholder' in definition ? definition.placeholder : undefined,
          error: isEditing ? fieldError : undefined,
          nullable: definition.nullable,
          options:
            definition.variant === 'async-combobox'
              ? policyOptions
              : 'options' in definition
                ? definition.options
                : undefined,
          optionsLoading:
            definition.variant === 'async-combobox'
              ? policyLookupQuery.isFetching
              : undefined,
          optionsSearch:
            definition.variant === 'async-combobox'
              ? policySearch
              : undefined,
          onOptionsSearchChange:
            definition.variant === 'async-combobox'
              ? setPolicySearch
              : undefined,
          onDraftChange: (nextValue: string) => changeDraft(field, nextValue),
          onDraftBlur: () => blurDraft(field),
          onStartEdit: () => startEdit(field),
          onSave: () => saveField(field),
          onCancel: () => cancelEdit(field),
        } satisfies InlineEditFieldProps
      }),
    }))
  }, [
    activeField,
    canEditField,
    cancelEdit,
    changeDraft,
    blurDraft,
    claim,
    draftValue,
    fieldError,
    isSaving,
    policyLookupQuery.isFetching,
    policyOptions,
    policySearch,
    saveField,
    startEdit,
  ])

  const summaryItems = useMemo<ClaimDetailSummaryItem[]>(() => {
    if (!claim) return []

    const policyLabel = formatPolicyLabel(
      claim.policyNumber,
      claim.policyInsurerName,
    )
    const affiliateName = formatFullName(
      claim.affiliateFirstName,
      claim.affiliateLastName,
    )
    const patientName = formatFullName(
      claim.patientFirstName,
      claim.patientLastName,
    )

    return [
      { label: 'Nro. reclamo', value: `#${claim.claimNumber}` },
      {
        label: 'Cliente',
        value: claim.clientName || claim.clientId,
      },
      {
        label: 'Afiliado',
        value: affiliateName ?? claim.affiliateId,
      },
      {
        label: 'Paciente',
        value: patientName ?? claim.patientId,
      },
      { label: 'Poliza', value: policyLabel ?? claim.policyId ?? 'Sin dato' },
      { label: 'Creado', value: formatClaimDateTime(claim.createdAt, 'datetime') },
      { label: 'Actualizado', value: formatClaimDateTime(claim.updatedAt, 'datetime') },
    ]
  }, [claim])

  if (!claim) {
    return {
      sections: [],
      summary: {
        items: [],
      },
    }
  }

  return {
    sections,
    summary: {
      items: summaryItems,
      statusLabel: CLAIM_STATUS_LABELS[claim.status],
      statusClassName: CLAIM_STATUS_BADGE_CLASSNAMES[claim.status],
    },
  }
}
