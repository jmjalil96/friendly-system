import type { Table } from '@tanstack/react-table'
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
import { cn } from '@/shared/lib/cn'

interface PaginationMeta {
  page: number
  limit: number
  totalCount: number
  totalPages: number
}

interface DataTablePaginationProps<TData> {
  table: Table<TData>
  paginationMeta?: PaginationMeta
  className?: string
}

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const

export function DataTablePagination<TData>({
  table,
  paginationMeta,
  className,
}: DataTablePaginationProps<TData>) {
  const currentPage = paginationMeta
    ? paginationMeta.page
    : table.getState().pagination.pageIndex + 1

  const totalPages = paginationMeta
    ? paginationMeta.totalPages
    : table.getPageCount()

  const totalCount = paginationMeta
    ? paginationMeta.totalCount
    : table.getFilteredRowModel().rows.length

  const canPrevious = paginationMeta
    ? paginationMeta.page > 1
    : table.getCanPreviousPage()

  const canNext = paginationMeta
    ? paginationMeta.page < paginationMeta.totalPages
    : table.getCanNextPage()

  const currentPageSize = table.getState().pagination.pageSize

  return (
    <div
      data-slot="data-table-pagination"
      className={cn(
        'flex flex-col gap-2 px-1 sm:flex-row sm:items-center sm:justify-between',
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-xs text-[var(--color-gray-500)]">
          {totalCount === 0
            ? 'Sin resultados'
            : `${totalCount} resultado${totalCount !== 1 ? 's' : ''}`}
        </p>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="xs"
              className="h-7 gap-1 rounded-full px-2.5 text-xs"
              aria-label="Seleccionar cantidad de filas por página"
            >
              Filas: {currentPageSize}
              <ChevronDown className="size-3 opacity-60" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-[9rem]">
            <DropdownMenuRadioGroup
              value={String(currentPageSize)}
              onValueChange={(value) => {
                const nextPageSize = Number(value)
                if (Number.isNaN(nextPageSize)) return
                table.setPageSize(nextPageSize)
              }}
            >
              {PAGE_SIZE_OPTIONS.map((pageSize) => (
                <DropdownMenuRadioItem key={pageSize} value={String(pageSize)}>
                  {pageSize} por página
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex w-full flex-wrap items-center justify-end gap-1 sm:w-auto sm:flex-nowrap">
        <Button
          variant="outline"
          size="icon"
          className="size-11 xl:size-7"
          onClick={() => table.setPageIndex(0)}
          disabled={!canPrevious}
          aria-label="Primera página"
        >
          <ChevronsLeft />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="size-11 xl:size-7"
          onClick={() => table.previousPage()}
          disabled={!canPrevious}
          aria-label="Página anterior"
        >
          <ChevronLeft />
        </Button>

        <span className="mx-2 text-sm font-medium text-[var(--color-gray-600)]">
          {currentPage} / {totalPages || 1}
        </span>

        <Button
          variant="outline"
          size="icon"
          className="size-11 xl:size-7"
          onClick={() => table.nextPage()}
          disabled={!canNext}
          aria-label="Página siguiente"
        >
          <ChevronRight />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="size-11 xl:size-7"
          onClick={() => table.setPageIndex(totalPages - 1)}
          disabled={!canNext}
          aria-label="Última página"
        >
          <ChevronsRight />
        </Button>
      </div>
    </div>
  )
}
