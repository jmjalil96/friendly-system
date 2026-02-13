import {
  type FocusEvent,
  type KeyboardEventHandler,
  useCallback,
  useMemo,
  useState,
} from 'react'
import { CalendarDays, Edit3, Loader2, Save, X } from 'lucide-react'
import { es } from 'date-fns/locale'
import { AsyncCombobox } from '@/shared/ui/composites/async-combobox'
import {
  dayFirstDateToIso,
  isIsoDate,
  isoDateToDayFirst,
  isoDateToLocalDate,
  localDateToIsoDate,
} from '@/shared/lib/date-format'
import { Button } from '@/shared/ui/primitives/button'
import { Input } from '@/shared/ui/primitives/input'
import { Calendar } from '@/shared/ui/primitives/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/shared/ui/primitives/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/primitives/select'
import { Textarea } from '@/shared/ui/primitives/textarea'
import { cn } from '@/shared/lib/cn'

export type InlineEditFieldVariant =
  | 'text'
  | 'textarea'
  | 'date'
  | 'select'
  | 'async-combobox'
  | 'decimal'

export interface InlineEditFieldOption {
  value: string
  label: string
}

export interface InlineEditFieldProps {
  label: string
  displayValue: string
  variant: InlineEditFieldVariant
  className?: string
  saveButtonClassName?: string
  editable: boolean
  isEditing: boolean
  isSaving: boolean
  draftValue: string
  placeholder?: string
  error?: string
  nullable?: boolean
  options?: readonly InlineEditFieldOption[]
  optionsLoading?: boolean
  optionsSearch?: string
  onOptionsSearchChange?: (value: string) => void
  onDraftChange: (value: string) => void
  onDraftBlur?: () => void
  onStartEdit: () => void
  onSave: () => void | Promise<void>
  onCancel: () => void
}

function maskDayFirstDateInput(rawValue: string): string {
  const digitsOnly = rawValue.replace(/\D/g, '').slice(0, 8)

  if (digitsOnly.length <= 2) return digitsOnly
  if (digitsOnly.length <= 4) {
    return `${digitsOnly.slice(0, 2)}/${digitsOnly.slice(2)}`
  }

  return `${digitsOnly.slice(0, 2)}/${digitsOnly.slice(2, 4)}/${digitsOnly.slice(4)}`
}

const DATE_POPOVER_ATTR = 'data-inline-date-popover'
const DATE_TRIGGER_ATTR = 'data-inline-date-trigger'

interface RenderEditorOptions {
  onPickerSelectionCommit: () => void
  onPickerTriggerKeyDown: KeyboardEventHandler<HTMLButtonElement>
}

interface DateEditorProps {
  draftValue: string
  isSaving: boolean
  placeholder?: string
  onDraftChange: (value: string) => void
  onDraftBlur?: () => void
  onSave: () => void | Promise<void>
  onPickerSelectionCommit: () => void
  onPickerTriggerKeyDown: KeyboardEventHandler<HTMLButtonElement>
}

function DateEditor({
  draftValue,
  isSaving,
  placeholder,
  onDraftChange,
  onDraftBlur,
  onSave,
  onPickerSelectionCommit,
  onPickerTriggerKeyDown,
}: DateEditorProps) {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)

  const selectedDate = useMemo(() => {
    const normalized = draftValue.trim()
    if (!normalized) return undefined

    const isoValue = isIsoDate(normalized)
      ? normalized
      : dayFirstDateToIso(normalized)
    if (!isoValue) return undefined

    return isoDateToLocalDate(isoValue) ?? undefined
  }, [draftValue])

  const handleCalendarSelect = useCallback(
    (value: Date | undefined) => {
      if (!value) return

      onDraftChange(isoDateToDayFirst(localDateToIsoDate(value)))
      onPickerSelectionCommit()
      setIsCalendarOpen(false)
    },
    [onDraftChange, onPickerSelectionCommit],
  )

  const handleInputBlur = useCallback(
    (event: FocusEvent<HTMLInputElement>) => {
      const relatedElement = event.relatedTarget as HTMLElement | null
      if (
        relatedElement?.closest(`[${DATE_POPOVER_ATTR}]`) ||
        relatedElement?.closest(`[${DATE_TRIGGER_ATTR}]`)
      ) {
        return
      }

      onDraftBlur?.()
    },
    [onDraftBlur],
  )

  return (
    <div className="flex items-center gap-2">
      <Input
        type="text"
        value={draftValue}
        onChange={(event) =>
          onDraftChange(maskDayFirstDateInput(event.target.value))
        }
        onBlur={handleInputBlur}
        onKeyDown={(event) => {
          if (event.key !== 'Enter') return
          if (event.nativeEvent.isComposing || isSaving) return
          if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey)
            return

          event.preventDefault()
          void onSave()
        }}
        placeholder={placeholder ?? 'DD/MM/AAAA'}
        inputMode="numeric"
        pattern="[0-9]{2}/[0-9]{2}/[0-9]{4}"
        maxLength={10}
      />
      <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Abrir calendario"
            data-inline-date-trigger="true"
            onKeyDown={onPickerTriggerKeyDown}
            disabled={isSaving}
            className="size-9 shrink-0"
          >
            <CalendarDays className="size-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="end"
          className="w-auto p-0"
          data-inline-date-popover="true"
        >
          <Calendar
            mode="single"
            defaultMonth={selectedDate}
            selected={selectedDate}
            onSelect={handleCalendarSelect}
            locale={es}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}

function renderEditor(
  props: InlineEditFieldProps,
  handlers: RenderEditorOptions,
) {
  const {
    variant,
    draftValue,
    isSaving,
    onDraftChange,
    onDraftBlur,
    onSave,
    placeholder,
    options,
    optionsLoading,
    optionsSearch,
    onOptionsSearchChange,
  } = props
  const { onPickerSelectionCommit, onPickerTriggerKeyDown } = handlers

  if (variant === 'date') {
    return (
      <DateEditor
        draftValue={draftValue}
        isSaving={isSaving}
        placeholder={placeholder}
        onDraftChange={onDraftChange}
        onDraftBlur={onDraftBlur}
        onSave={onSave}
        onPickerSelectionCommit={onPickerSelectionCommit}
        onPickerTriggerKeyDown={onPickerTriggerKeyDown}
      />
    )
  }

  if (variant === 'textarea') {
    return (
      <Textarea
        value={draftValue}
        onChange={(event) => onDraftChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key !== 'Enter') return
          if (event.nativeEvent.isComposing || isSaving) return
          if (!(event.metaKey || event.ctrlKey)) return

          event.preventDefault()
          void onSave()
        }}
        rows={4}
        placeholder={placeholder}
        className="min-h-[7.5rem] resize-y"
      />
    )
  }

  if (variant === 'select') {
    return (
      <Select
        value={draftValue}
        onValueChange={(nextValue) => {
          onDraftChange(nextValue)
          onPickerSelectionCommit()
        }}
      >
        <SelectTrigger onKeyDown={onPickerTriggerKeyDown}>
          <SelectValue placeholder="Seleccionar..." />
        </SelectTrigger>
        <SelectContent>
          {(options ?? []).map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
  }

  if (variant === 'async-combobox') {
    return (
      <AsyncCombobox
        value={draftValue}
        onValueChange={(nextValue) => {
          onDraftChange(nextValue)
          onPickerSelectionCommit()
        }}
        options={[...(options ?? [])]}
        getOptionValue={(option) => option.value}
        getOptionLabel={(option) => option.label}
        searchQuery={optionsSearch ?? ''}
        onSearchChange={onOptionsSearchChange ?? (() => {})}
        isLoading={optionsLoading}
        placeholder={placeholder ?? 'Seleccionar...'}
        searchPlaceholder="Buscar..."
        emptyMessage="No se encontraron resultados."
        onTriggerKeyDown={onPickerTriggerKeyDown}
      />
    )
  }

  return (
    <Input
      type="text"
      value={draftValue}
      onChange={(event) => onDraftChange(event.target.value)}
      onKeyDown={(event) => {
        if (event.key !== 'Enter') return
        if (event.nativeEvent.isComposing || isSaving) return
        if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey)
          return

        event.preventDefault()
        void onSave()
      }}
      placeholder={placeholder}
      inputMode={variant === 'decimal' ? 'decimal' : undefined}
      className={variant === 'decimal' ? 'tabular-nums' : undefined}
    />
  )
}

export function InlineEditField(props: InlineEditFieldProps) {
  const {
    label,
    displayValue,
    editable,
    isEditing,
    isSaving,
    onStartEdit,
    onSave,
    onCancel,
    error,
    nullable = false,
    onDraftChange,
    className,
    saveButtonClassName,
  } = props
  const [pickerSelectionCommitted, setPickerSelectionCommitted] =
    useState(false)

  const handlePickerSelectionCommit = useCallback(() => {
    setPickerSelectionCommitted(true)
  }, [])

  const handleStartEdit = useCallback(() => {
    setPickerSelectionCommitted(false)
    onStartEdit()
  }, [onStartEdit])

  const handleCancelEdit = useCallback(() => {
    setPickerSelectionCommitted(false)
    onCancel()
  }, [onCancel])

  const handlePickerTriggerKeyDown = useCallback<
    KeyboardEventHandler<HTMLButtonElement>
  >(
    (event) => {
      if (event.key !== 'Enter') return
      if (isSaving || !pickerSelectionCommitted) return

      event.preventDefault()
      event.stopPropagation()
      void onSave()
    },
    [isSaving, onSave, pickerSelectionCommitted],
  )

  if (isEditing) {
    return (
      <div
        className={cn(
          'rounded-[var(--radius-md)] border border-[var(--color-blue-200)] bg-[var(--color-blue-50)]/30 p-3',
          className,
        )}
      >
        <p className="mb-2 text-[0.72rem] font-semibold tracking-wide text-[var(--color-blue-700)] uppercase">
          {label}
        </p>
        <div className="space-y-2">
          {renderEditor(props, {
            onPickerSelectionCommit: handlePickerSelectionCommit,
            onPickerTriggerKeyDown: handlePickerTriggerKeyDown,
          })}
          {error ? (
            <p className="text-xs text-[var(--color-red-600)]">{error}</p>
          ) : null}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {nullable ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onDraftChange('')}
              disabled={isSaving}
            >
              Limpiar
            </Button>
          ) : null}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCancelEdit}
            disabled={isSaving}
          >
            <X className="size-3.5" />
            Cancelar
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => void onSave()}
            disabled={isSaving}
            className={saveButtonClassName}
          >
            {isSaving ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Save className="size-3.5" />
            )}
            Guardar
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'group/field rounded-[var(--radius-md)] border border-transparent bg-[var(--color-gray-50)]/60 p-3 transition-colors hover:bg-[var(--color-gray-50)]',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-[0.72rem] font-semibold tracking-wide text-[var(--color-gray-500)] uppercase">
            {label}
          </p>
          <p className="mt-1 whitespace-pre-wrap break-words text-sm text-[var(--color-gray-900)]">
            {displayValue}
          </p>
        </div>

        {editable ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={handleStartEdit}
            aria-label="Editar"
            className="shrink-0 text-[var(--color-gray-400)] opacity-0 transition-opacity group-hover/field:opacity-100 hover:text-[var(--color-gray-700)]"
          >
            <Edit3 className="size-3.5" />
          </Button>
        ) : null}
      </div>
    </div>
  )
}
