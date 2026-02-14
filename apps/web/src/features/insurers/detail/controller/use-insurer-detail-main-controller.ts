import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  updateInsurerSchema,
  type GetInsurerByIdResponse,
  type UpdateInsurerInput,
} from '@friendly-system/shared'
import { toast } from '@/shared/hooks/use-toast'
import type {
  InlineEditFieldOption,
  InlineEditFieldProps,
} from '@/shared/ui/composites/inline-edit-field'
import { useUpdateInsurer } from '@/features/insurers/api/insurers.hooks'
import {
  formatInsurerDateTime,
  formatInsurerType,
} from '@/features/insurers/model/insurers.formatters'
import { INSURERS_INLINE_SAVE_BUTTON_CLASSNAME } from '@/features/insurers/model/insurers.ui-tokens'

type DetailFieldKey =
  | 'name'
  | 'type'
  | 'isActive'
  | 'code'
  | 'email'
  | 'phone'
  | 'website'

interface FieldDefinition {
  key: DetailFieldKey
  label: string
  variant: InlineEditFieldProps['variant']
  nullable: boolean
  placeholder?: string
  options?: readonly InlineEditFieldOption[]
}

interface SectionDefinition {
  key: 'principal' | 'contacto'
  title: string
  subtitle: string
  fields: readonly FieldDefinition[]
}

export interface InsurerDetailMainSection {
  key: SectionDefinition['key']
  title: string
  subtitle: string
  fields: InlineEditFieldProps[]
}

export interface InsurerDetailSummaryItem {
  label: string
  value: string
}

export interface UseInsurerDetailMainControllerParams {
  insurerId: string
  insurer?: GetInsurerByIdResponse
}

export interface UseInsurerDetailMainControllerResult {
  sections: InsurerDetailMainSection[]
  summary: {
    items: InsurerDetailSummaryItem[]
  }
}

const ACTIVE_OPTIONS = [
  { value: 'true', label: 'Activo' },
  { value: 'false', label: 'Inactivo' },
] as const satisfies readonly InlineEditFieldOption[]

const TYPE_OPTIONS = [
  { value: 'MEDICINA_PREPAGADA', label: 'Medicina prepagada' },
  { value: 'COMPANIA_DE_SEGUROS', label: 'Compañía de seguros' },
] as const satisfies readonly InlineEditFieldOption[]

const SECTION_DEFINITIONS = [
  {
    key: 'principal',
    title: 'Datos principales',
    subtitle: 'Campos operativos de la aseguradora.',
    fields: [
      {
        key: 'name',
        label: 'Nombre',
        variant: 'text',
        nullable: false,
        placeholder: 'Nombre de la aseguradora',
      },
      {
        key: 'type',
        label: 'Tipo',
        variant: 'select',
        nullable: false,
        options: TYPE_OPTIONS,
      },
      {
        key: 'isActive',
        label: 'Estado',
        variant: 'select',
        nullable: false,
        options: ACTIVE_OPTIONS,
      },
      {
        key: 'code',
        label: 'Código',
        variant: 'text',
        nullable: true,
        placeholder: 'Ej. SURA',
      },
    ],
  },
  {
    key: 'contacto',
    title: 'Contacto',
    subtitle: 'Información de contacto y web.',
    fields: [
      {
        key: 'email',
        label: 'Email',
        variant: 'text',
        nullable: true,
        placeholder: 'contacto@aseguradora.com',
      },
      {
        key: 'phone',
        label: 'Teléfono',
        variant: 'text',
        nullable: true,
        placeholder: '+57 300 000 0000',
      },
      {
        key: 'website',
        label: 'Sitio web',
        variant: 'text',
        nullable: true,
        placeholder: 'https://aseguradora.com',
      },
    ],
  },
] as const satisfies readonly SectionDefinition[]

function parseFieldValue(
  insurer: GetInsurerByIdResponse,
  field: DetailFieldKey,
): string {
  if (field === 'name') return insurer.name
  if (field === 'type') return insurer.type
  if (field === 'isActive') return insurer.isActive ? 'true' : 'false'
  if (field === 'code') return insurer.code ?? ''
  if (field === 'email') return insurer.email ?? ''
  if (field === 'phone') return insurer.phone ?? ''
  return insurer.website ?? ''
}

function formatDisplayValue(field: DetailFieldKey, value: string): string {
  if (field === 'isActive') {
    return value === 'true' ? 'Activo' : 'Inactivo'
  }

  if (field === 'type') {
    return formatInsurerType(
      value as 'MEDICINA_PREPAGADA' | 'COMPANIA_DE_SEGUROS',
    )
  }

  if (value.trim().length === 0) return 'Sin dato'
  return value
}

function normalizeDraftValue(field: DetailFieldKey, rawValue: string): string {
  if (field === 'isActive' || field === 'type') return rawValue
  return rawValue.trim()
}

function toPatchPayload(
  field: DetailFieldKey,
  value: string,
): { payload?: UpdateInsurerInput; error?: string } {
  if (field === 'name') {
    const parsed = updateInsurerSchema.safeParse({ name: value })
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? 'Invalid value' }
    }

    return { payload: parsed.data }
  }

  if (field === 'type') {
    const parsed = updateInsurerSchema.safeParse({
      type: value as 'MEDICINA_PREPAGADA' | 'COMPANIA_DE_SEGUROS',
    })
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? 'Invalid value' }
    }

    return { payload: parsed.data }
  }

  if (field === 'isActive') {
    const parsed = updateInsurerSchema.safeParse({ isActive: value === 'true' })
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? 'Invalid value' }
    }

    return { payload: parsed.data }
  }

  const nullableValue = value === '' ? null : value
  const parsed = updateInsurerSchema.safeParse({ [field]: nullableValue })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid value' }
  }

  return { payload: parsed.data }
}

export function useInsurerDetailMainController({
  insurerId,
  insurer,
}: UseInsurerDetailMainControllerParams): UseInsurerDetailMainControllerResult {
  const { updateInsurer, updateInsurerStatus } = useUpdateInsurer(insurerId)
  const isSaving = updateInsurerStatus === 'pending'

  const [activeField, setActiveField] = useState<DetailFieldKey | null>(null)
  const [draftValue, setDraftValue] = useState('')
  const [fieldError, setFieldError] = useState<string>()

  useEffect(() => {
    setActiveField(null)
    setDraftValue('')
    setFieldError(undefined)
  }, [insurerId])

  const onStartEdit = useCallback(
    (field: DetailFieldKey) => {
      if (!insurer || isSaving) return
      setActiveField(field)
      setDraftValue(parseFieldValue(insurer, field))
      setFieldError(undefined)
    },
    [insurer, isSaving],
  )

  const onCancelEdit = useCallback(() => {
    if (isSaving) return
    setActiveField(null)
    setDraftValue('')
    setFieldError(undefined)
  }, [isSaving])

  const onSaveField = useCallback(async () => {
    if (!insurer || !activeField || isSaving) return

    const normalizedDraft = normalizeDraftValue(activeField, draftValue)
    const currentValue = normalizeDraftValue(
      activeField,
      parseFieldValue(insurer, activeField),
    )

    if (normalizedDraft === currentValue) {
      setActiveField(null)
      setDraftValue('')
      setFieldError(undefined)
      return
    }

    const validated = toPatchPayload(activeField, normalizedDraft)
    if (!validated.payload) {
      setFieldError(validated.error ?? 'Valor inválido')
      return
    }

    try {
      setFieldError(undefined)
      await updateInsurer(validated.payload)
      toast.success('Aseguradora actualizada')
      setActiveField(null)
      setDraftValue('')
    } catch {
      toast.error('No pudimos guardar los cambios')
    }
  }, [activeField, insurer, draftValue, isSaving, updateInsurer])

  const sections = useMemo<InsurerDetailMainSection[]>(() => {
    return SECTION_DEFINITIONS.map((section) => ({
      key: section.key,
      title: section.title,
      subtitle: section.subtitle,
      fields: section.fields.map((field) => {
        const currentValue = insurer ? parseFieldValue(insurer, field.key) : ''
        const displayValue = insurer
          ? formatDisplayValue(field.key, currentValue)
          : 'Sin dato'

        const isEditing = activeField === field.key

        return {
          label: field.label,
          displayValue,
          variant: field.variant,
          editable: Boolean(insurer),
          isEditing,
          isSaving: isEditing && isSaving,
          draftValue: isEditing ? draftValue : currentValue,
          placeholder: 'placeholder' in field ? field.placeholder : undefined,
          nullable: field.nullable,
          options: 'options' in field ? field.options : undefined,
          saveButtonClassName: INSURERS_INLINE_SAVE_BUTTON_CLASSNAME,
          error: isEditing ? fieldError : undefined,
          onDraftChange: (value: string) => {
            if (!isEditing) return
            setDraftValue(value)
            if (fieldError) setFieldError(undefined)
          },
          onStartEdit: () => onStartEdit(field.key),
          onSave: onSaveField,
          onCancel: onCancelEdit,
        } satisfies InlineEditFieldProps
      }),
    }))
  }, [
    activeField,
    insurer,
    draftValue,
    fieldError,
    isSaving,
    onCancelEdit,
    onSaveField,
    onStartEdit,
  ])

  const summary = useMemo(
    () => ({
      items: [
        {
          label: 'Creado',
          value: insurer
            ? formatInsurerDateTime(insurer.createdAt, 'datetime')
            : 'Sin dato',
        },
        {
          label: 'Actualizado',
          value: insurer
            ? formatInsurerDateTime(insurer.updatedAt, 'datetime')
            : 'Sin dato',
        },
      ],
    }),
    [insurer],
  )

  return {
    sections,
    summary,
  }
}
