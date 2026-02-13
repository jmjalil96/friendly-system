import * as React from 'react'
import { X } from 'lucide-react'
import { Button } from '@/shared/ui/primitives/button'
import { cn } from '@/shared/lib/cn'

/* ————————————————————————————————————————————
 * FilterBar (root)
 * White container with bottom border.
 * ———————————————————————————————————————————— */

function FilterBarRoot({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="filter-bar"
      className={cn(
        'bg-white border-b border-[var(--color-gray-200)]',
        className,
      )}
      {...props}
    />
  )
}

/* ————————————————————————————————————————————
 * FilterBar.Controls
 * Flex-wrap row for filter primitives.
 * ———————————————————————————————————————————— */

function FilterBarControls({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="filter-bar-controls"
      className={cn(
        'flex min-w-0 w-full flex-1 flex-wrap items-center gap-2 sm:w-auto',
        className,
      )}
      {...props}
    />
  )
}

/* ————————————————————————————————————————————
 * FilterBar.Actions
 * Right-aligned slot for clear, more filters, etc.
 * ———————————————————————————————————————————— */

function FilterBarActions({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="filter-bar-actions"
      className={cn(
        'flex w-full shrink-0 items-center justify-end gap-2 sm:w-auto',
        className,
      )}
      {...props}
    />
  )
}

/* ————————————————————————————————————————————
 * FilterBar.Row
 * Top row: Controls + Actions side by side.
 * ———————————————————————————————————————————— */

function FilterBarRow({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="filter-bar-row"
      className={cn('flex items-center gap-3 px-4 py-3 sm:px-6', className)}
      {...props}
    />
  )
}

/* ————————————————————————————————————————————
 * FilterBar.Chips
 * Horizontal scrollable row for active filter chips.
 * Returns null when empty.
 * ———————————————————————————————————————————— */

function FilterBarChips({
  className,
  children,
  ...props
}: React.ComponentProps<'div'>) {
  const hasChildren = React.Children.toArray(children).length > 0
  if (!hasChildren) return null

  return (
    <div
      data-slot="filter-bar-chips"
      className={cn(
        'flex items-center gap-1.5 overflow-x-auto px-4 pt-1 pb-2.5 sm:px-6',
        '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}

/* ————————————————————————————————————————————
 * FilterBar.Chip
 * Blue pill with label + X remove button.
 * ———————————————————————————————————————————— */

interface FilterBarChipProps {
  label: string
  onRemove: () => void
  className?: string
}

function FilterBarChip({ label, onRemove, className }: FilterBarChipProps) {
  return (
    <span
      data-slot="filter-bar-chip"
      className={cn(
        'inline-flex shrink-0 items-center gap-1 rounded-full bg-[var(--color-blue-50)] px-2.5 py-0.5 text-xs font-medium text-[var(--color-blue-700)]',
        className,
      )}
    >
      {label}
      <Button
        data-slot="filter-bar-chip-remove"
        type="button"
        variant="ghost"
        size="icon-xs"
        onClick={onRemove}
        className="size-4 rounded-full p-0 text-[var(--color-blue-700)] hover:bg-[var(--color-blue-500)]/15 hover:text-[var(--color-blue-700)]"
        aria-label={`Remover filtro: ${label}`}
      >
        <X className="size-2.5" />
      </Button>
    </span>
  )
}

/* ————————————————————————————————————————————
 * FilterBar.ClearAll
 * Ghost text button to reset all filters.
 * ———————————————————————————————————————————— */

interface FilterBarClearAllProps {
  onClear: () => void
  label?: string
  className?: string
}

function FilterBarClearAll({
  onClear,
  label = 'Limpiar filtros',
  className,
}: FilterBarClearAllProps) {
  return (
    <Button
      data-slot="filter-bar-clear-all"
      type="button"
      variant="ghost"
      size="xs"
      onClick={onClear}
      className={cn(
        'h-auto px-1 text-xs font-medium text-[var(--color-gray-500)] underline-offset-2 hover:bg-transparent hover:text-[var(--color-gray-900)] hover:underline',
        className,
      )}
    >
      {label}
    </Button>
  )
}

/* ————————————————————————————————————————————
 * Compound export
 * ———————————————————————————————————————————— */

const FilterBar = Object.assign(FilterBarRoot, {
  Row: FilterBarRow,
  Controls: FilterBarControls,
  Actions: FilterBarActions,
  Chips: FilterBarChips,
  Chip: FilterBarChip,
  ClearAll: FilterBarClearAll,
})

export { FilterBar }
