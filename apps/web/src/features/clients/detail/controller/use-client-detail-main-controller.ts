import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  updateClientSchema,
  type GetClientByIdResponse,
  type UpdateClientInput,
} from '@friendly-system/shared'
import { toast } from '@/shared/hooks/use-toast'
import type {
  InlineEditFieldOption,
  InlineEditFieldProps,
} from '@/shared/ui/composites/inline-edit-field'
import { useUpdateClient } from '@/features/clients/api/clients.hooks'
import { formatClientDateTime } from '@/features/clients/model/clients.formatters'
import { CLIENTS_INLINE_SAVE_BUTTON_CLASSNAME } from '@/features/clients/model/clients.ui-tokens'

type DetailFieldKey = 'name' | 'isActive'

interface FieldDefinition {
  key: DetailFieldKey
  label: string
  variant: InlineEditFieldProps['variant']
  nullable: boolean
  placeholder?: string
  options?: readonly InlineEditFieldOption[]
}

interface SectionDefinition {
  key: 'principal'
  title: string
  subtitle: string
  fields: readonly FieldDefinition[]
}

export interface ClientDetailMainSection {
  key: SectionDefinition['key']
  title: string
  subtitle: string
  fields: InlineEditFieldProps[]
}

export interface ClientDetailSummaryItem {
  label: string
  value: string
}

export interface UseClientDetailMainControllerParams {
  clientId: string
  client?: GetClientByIdResponse
}

export interface UseClientDetailMainControllerResult {
  sections: ClientDetailMainSection[]
  summary: {
    items: ClientDetailSummaryItem[]
  }
}

const ACTIVE_OPTIONS = [
  { value: 'true', label: 'Activo' },
  { value: 'false', label: 'Inactivo' },
] as const satisfies readonly InlineEditFieldOption[]

const SECTION_DEFINITIONS = [
  {
    key: 'principal',
    title: 'Datos principales',
    subtitle: 'Campos operativos del cliente.',
    fields: [
      {
        key: 'name',
        label: 'Nombre',
        variant: 'text',
        nullable: false,
        placeholder: 'Nombre del cliente',
      },
      {
        key: 'isActive',
        label: 'Estado',
        variant: 'select',
        nullable: false,
        options: ACTIVE_OPTIONS,
      },
    ],
  },
] as const satisfies readonly SectionDefinition[]

function parseFieldValue(
  client: GetClientByIdResponse,
  field: DetailFieldKey,
): string {
  if (field === 'name') return client.name
  return client.isActive ? 'true' : 'false'
}

function formatDisplayValue(field: DetailFieldKey, value: string): string {
  if (field === 'isActive') {
    return value === 'true' ? 'Activo' : 'Inactivo'
  }
  return value
}

function normalizeDraftValue(field: DetailFieldKey, rawValue: string): string {
  if (field === 'name') return rawValue.trim()
  return rawValue
}

function toPatchPayload(
  field: DetailFieldKey,
  value: string,
): { payload?: UpdateClientInput; error?: string } {
  if (field === 'name') {
    const parsed = updateClientSchema.safeParse({ name: value })
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? 'Invalid value' }
    }

    return { payload: parsed.data }
  }

  const parsed = updateClientSchema.safeParse({ isActive: value === 'true' })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid value' }
  }

  return { payload: parsed.data }
}

export function useClientDetailMainController({
  clientId,
  client,
}: UseClientDetailMainControllerParams): UseClientDetailMainControllerResult {
  const { updateClient, updateClientStatus } = useUpdateClient(clientId)
  const isSaving = updateClientStatus === 'pending'

  const [activeField, setActiveField] = useState<DetailFieldKey | null>(null)
  const [draftValue, setDraftValue] = useState('')
  const [fieldError, setFieldError] = useState<string>()

  useEffect(() => {
    setActiveField(null)
    setDraftValue('')
    setFieldError(undefined)
  }, [clientId])

  const onStartEdit = useCallback(
    (field: DetailFieldKey) => {
      if (!client || isSaving) return
      setActiveField(field)
      setDraftValue(parseFieldValue(client, field))
      setFieldError(undefined)
    },
    [client, isSaving],
  )

  const onCancelEdit = useCallback(() => {
    if (isSaving) return
    setActiveField(null)
    setDraftValue('')
    setFieldError(undefined)
  }, [isSaving])

  const onSaveField = useCallback(async () => {
    if (!client || !activeField || isSaving) return

    const normalizedDraft = normalizeDraftValue(activeField, draftValue)
    const currentValue = normalizeDraftValue(
      activeField,
      parseFieldValue(client, activeField),
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
      await updateClient(validated.payload)
      toast.success('Cliente actualizado')
      setActiveField(null)
      setDraftValue('')
    } catch {
      toast.error('No pudimos guardar los cambios')
    }
  }, [activeField, client, draftValue, isSaving, updateClient])

  const sections = useMemo<ClientDetailMainSection[]>(() => {
    return SECTION_DEFINITIONS.map((section) => ({
      key: section.key,
      title: section.title,
      subtitle: section.subtitle,
      fields: section.fields.map((field) => {
        const currentValue = client ? parseFieldValue(client, field.key) : ''
        const displayValue = client
          ? formatDisplayValue(field.key, currentValue)
          : 'Sin dato'

        const isEditing = activeField === field.key

        return {
          label: field.label,
          displayValue,
          variant: field.variant,
          editable: Boolean(client),
          isEditing,
          isSaving: isEditing && isSaving,
          draftValue: isEditing ? draftValue : currentValue,
          placeholder: 'placeholder' in field ? field.placeholder : undefined,
          nullable: field.nullable,
          options: 'options' in field ? field.options : undefined,
          saveButtonClassName: CLIENTS_INLINE_SAVE_BUTTON_CLASSNAME,
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
    client,
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
          value: client
            ? formatClientDateTime(client.createdAt, 'datetime')
            : 'Sin dato',
        },
        {
          label: 'Actualizado',
          value: client
            ? formatClientDateTime(client.updatedAt, 'datetime')
            : 'Sin dato',
        },
      ],
    }),
    [client],
  )

  return {
    sections,
    summary,
  }
}
