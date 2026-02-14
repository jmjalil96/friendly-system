import { ChevronDown, Search } from 'lucide-react'
import { Button } from '@/shared/ui/primitives/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/shared/ui/primitives/dropdown-menu'
import { FilterBar } from '@/shared/ui/composites/filter-bar'
import { Input } from '@/shared/ui/primitives/input'
import type { PolicyStatus } from '@friendly-system/shared'
import {
  POLICY_STATUS_LABELS,
  POLICY_STATUS_OPTIONS,
} from '@/features/policies/model/policies.status'

export interface PoliciesFilterChip {
  key: string
  label: string
  onRemove: () => void
}

export interface PoliciesFilterBarProps {
  search: string
  onSearchChange: (value: string) => void
  selectedStatuses: PolicyStatus[]
  onToggleStatus: (status: PolicyStatus) => void
  chips: PoliciesFilterChip[]
  onClearAll: () => void
}

function getStatusButtonLabel(statuses: PolicyStatus[]): string {
  if (statuses.length === 0) return 'Estado'
  if (statuses.length === 1) {
    return `Estado: ${POLICY_STATUS_LABELS[statuses[0]]}`
  }
  return `Estado: ${statuses.length}`
}

export function PoliciesFilterBar({
  search,
  onSearchChange,
  selectedStatuses,
  onToggleStatus,
  chips,
  onClearAll,
}: PoliciesFilterBarProps) {
  return (
    <FilterBar>
      <FilterBar.Row className="flex-wrap items-start sm:items-center">
        <FilterBar.Controls>
          <div className="relative w-full sm:w-auto sm:min-w-[220px] md:min-w-[280px]">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[var(--color-gray-400)]" />
            <Input
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Buscar póliza..."
              className="h-8 pl-8 text-sm"
              aria-label="Buscar póliza"
            />
          </div>

          <div className="w-auto shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-auto justify-between gap-1.5 rounded-full px-3 text-xs"
                >
                  {getStatusButtonLabel(selectedStatuses)}
                  <ChevronDown className="size-3 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                {POLICY_STATUS_OPTIONS.map((status) => (
                  <DropdownMenuCheckboxItem
                    key={status}
                    checked={selectedStatuses.includes(status)}
                    onCheckedChange={() => onToggleStatus(status)}
                  >
                    {POLICY_STATUS_LABELS[status]}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {chips.length > 0 ? (
            <FilterBar.Actions className="ml-auto w-auto justify-end">
              <FilterBar.ClearAll onClear={onClearAll} />
            </FilterBar.Actions>
          ) : null}
        </FilterBar.Controls>
      </FilterBar.Row>

      <FilterBar.Chips>
        {chips.map((chip) => (
          <FilterBar.Chip
            key={chip.key}
            label={chip.label}
            onRemove={chip.onRemove}
          />
        ))}
      </FilterBar.Chips>
    </FilterBar>
  )
}
