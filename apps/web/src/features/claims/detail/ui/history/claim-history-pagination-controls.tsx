import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react'
import { Button } from '@/shared/ui/primitives/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/shared/ui/primitives/dropdown-menu'

export interface ClaimHistoryPaginationControlsProps {
  entityLabel: string
  page: number
  limit: number
  limitOptions: readonly number[]
  totalCount: number
  totalPages: number
  onFirstPage: () => void
  onPreviousPage: () => void
  onNextPage: () => void
  onLastPage: () => void
  onLimitChange: (value: number) => void
}

export function ClaimHistoryPaginationControls({
  entityLabel,
  page,
  limit,
  limitOptions,
  totalCount,
  totalPages,
  onFirstPage,
  onPreviousPage,
  onNextPage,
  onLastPage,
  onLimitChange,
}: ClaimHistoryPaginationControlsProps) {
  const canPreviousPage = page > 1
  const canNextPage = page < totalPages

  return (
    <div className="flex flex-col gap-2 px-1 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-xs text-[var(--color-gray-500)]">
          {totalCount === 0
            ? 'Sin resultados'
            : `${totalCount} resultado${totalCount === 1 ? '' : 's'}`}
        </p>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="xs"
              className="h-7 gap-1 rounded-full px-2.5 text-xs"
              aria-label={`Seleccionar cantidad de filas de ${entityLabel}`}
            >
              Filas: {limit}
              <ChevronDown className="size-3 opacity-60" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-[9rem]">
            <DropdownMenuRadioGroup
              value={String(limit)}
              onValueChange={(value) => {
                const nextLimit = Number(value)
                if (Number.isNaN(nextLimit)) return
                onLimitChange(nextLimit)
              }}
            >
              {limitOptions.map((option) => (
                <DropdownMenuRadioItem key={option} value={String(option)}>
                  {option} por página
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex w-full flex-wrap items-center justify-end gap-1 sm:w-auto sm:flex-nowrap">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-11 xl:size-7"
          disabled={!canPreviousPage}
          onClick={onFirstPage}
          aria-label={`Primera página de ${entityLabel}`}
        >
          <ChevronsLeft />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-11 xl:size-7"
          disabled={!canPreviousPage}
          onClick={onPreviousPage}
          aria-label={`Página anterior de ${entityLabel}`}
        >
          <ChevronLeft />
        </Button>

        <span className="mx-2 text-sm font-medium text-[var(--color-gray-600)]">
          {page} / {totalPages}
        </span>

        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-11 xl:size-7"
          disabled={!canNextPage}
          onClick={onNextPage}
          aria-label={`Página siguiente de ${entityLabel}`}
        >
          <ChevronRight />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-11 xl:size-7"
          disabled={!canNextPage}
          onClick={onLastPage}
          aria-label={`Última página de ${entityLabel}`}
        >
          <ChevronsRight />
        </Button>
      </div>
    </div>
  )
}
