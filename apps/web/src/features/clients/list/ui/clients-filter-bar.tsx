import { ChevronDown, Search } from 'lucide-react'
import { Button } from '@/shared/ui/primitives/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/shared/ui/primitives/dropdown-menu'
import { FilterBar } from '@/shared/ui/composites/filter-bar'
import { Input } from '@/shared/ui/primitives/input'

export interface ClientsFilterChip {
  key: string
  label: string
  onRemove: () => void
}

export interface ClientsFilterBarProps {
  search: string
  onSearchChange: (value: string) => void
  isActive: boolean | undefined
  onIsActiveChange: (value: boolean | undefined) => void
  chips: ClientsFilterChip[]
  onClearAll: () => void
}

function getActiveButtonLabel(value: boolean | undefined): string {
  if (value === true) return 'Estado: Activo'
  if (value === false) return 'Estado: Inactivo'
  return 'Estado'
}

function parseFilterValue(value: string): boolean | undefined {
  if (value === 'active') return true
  if (value === 'inactive') return false
  return undefined
}

export function ClientsFilterBar({
  search,
  onSearchChange,
  isActive,
  onIsActiveChange,
  chips,
  onClearAll,
}: ClientsFilterBarProps) {
  return (
    <FilterBar>
      <FilterBar.Row className="flex-wrap items-start sm:items-center">
        <FilterBar.Controls>
          <div className="relative w-full sm:w-auto sm:min-w-[220px] md:min-w-[280px]">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[var(--color-gray-400)]" />
            <Input
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Buscar cliente..."
              className="h-8 pl-8 text-sm"
              aria-label="Buscar cliente"
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
                  {getActiveButtonLabel(isActive)}
                  <ChevronDown className="size-3 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuRadioGroup
                  value={
                    isActive === true
                      ? 'active'
                      : isActive === false
                        ? 'inactive'
                        : 'all'
                  }
                  onValueChange={(value) =>
                    onIsActiveChange(parseFilterValue(value))
                  }
                >
                  <DropdownMenuRadioItem value="all">
                    Todos
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="active">
                    Activos
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="inactive">
                    Inactivos
                  </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
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
