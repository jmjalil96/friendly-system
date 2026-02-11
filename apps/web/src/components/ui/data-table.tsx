import * as React from 'react'
import {
  type ColumnDef,
  type Header,
  type SortingState,
  type PaginationState,
  type OnChangeFn,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { DataTablePagination } from '@/components/ui/data-table-pagination'

/* ————————————————————————————————————————————
 * Column header with sort indicators
 * ———————————————————————————————————————————— */

function DataTableColumnHeader<TData>({
  header,
}: {
  header: Header<TData, unknown>
}) {
  if (!header.column.getCanSort()) {
    return flexRender(header.column.columnDef.header, header.getContext())
  }

  const sorted = header.column.getIsSorted()

  return (
    <button
      type="button"
      className={cn(
        '-ml-1 inline-flex items-center gap-1 rounded-[var(--radius-sm)] px-1 py-0.5',
        'transition-colors hover:text-[var(--color-gray-900)]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-blue-500)]/30',
      )}
      onClick={() => {
        const nextDesc = sorted === 'asc'
        header.column.toggleSorting(nextDesc)
      }}
    >
      {flexRender(header.column.columnDef.header, header.getContext())}
      {sorted === 'asc' ? (
        <ArrowUp className="size-3.5 text-[var(--color-blue-500)]" />
      ) : sorted === 'desc' ? (
        <ArrowDown className="size-3.5 text-[var(--color-blue-500)]" />
      ) : (
        <ArrowUpDown className="size-3.5 opacity-40" />
      )}
    </button>
  )
}

/* ————————————————————————————————————————————
 * DataTable
 * ———————————————————————————————————————————— */

interface PaginationMeta {
  page: number
  limit: number
  totalCount: number
  totalPages: number
}

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]

  isLoading?: boolean
  loadingRows?: number
  emptyMessage?: string

  sorting?: SortingState
  onSortingChange?: OnChangeFn<SortingState>
  manualSorting?: boolean

  pagination?: PaginationState
  onPaginationChange?: OnChangeFn<PaginationState>
  manualPagination?: boolean
  paginationMeta?: PaginationMeta
  rowCount?: number
  pageSize?: number
  tableClassName?: string
  tableContainerClassName?: string
  tableWrapperClassName?: string
  stickyHeader?: boolean
  paginationClassName?: string

  className?: string
}

export function DataTable<TData, TValue>({
  columns,
  data,
  isLoading = false,
  loadingRows = 5,
  emptyMessage = 'No hay resultados.',
  sorting: externalSorting,
  onSortingChange,
  manualSorting = false,
  pagination: externalPagination,
  onPaginationChange,
  manualPagination = false,
  paginationMeta,
  rowCount,
  pageSize = 10,
  tableClassName,
  tableContainerClassName,
  tableWrapperClassName,
  stickyHeader = false,
  paginationClassName,
  className,
}: DataTableProps<TData, TValue>) {
  const [internalSorting, setInternalSorting] = React.useState<SortingState>([])
  const [internalPagination, setInternalPagination] =
    React.useState<PaginationState>({ pageIndex: 0, pageSize })

  const sorting = externalSorting ?? internalSorting
  const pagination = externalPagination ?? internalPagination

  const table = useReactTable({
    data,
    columns,
    state: { sorting, pagination },
    onSortingChange: onSortingChange ?? setInternalSorting,
    onPaginationChange: onPaginationChange ?? setInternalPagination,
    enableSortingRemoval: false,
    getCoreRowModel: getCoreRowModel(),
    ...(manualSorting
      ? { manualSorting: true }
      : { getSortedRowModel: getSortedRowModel() }),
    ...(manualPagination
      ? {
          manualPagination: true,
          rowCount: rowCount ?? paginationMeta?.totalCount ?? 0,
        }
      : { getPaginationRowModel: getPaginationRowModel() }),
  })

  return (
    <div data-slot="data-table" className={cn('space-y-4', className)}>
      <div
        className={cn(
          'overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-gray-200)]',
          tableWrapperClassName,
        )}
      >
        <Table
          className={tableClassName}
          containerClassName={tableContainerClassName}
        >
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow
                key={headerGroup.id}
                className="bg-[var(--color-gray-50)] hover:bg-[var(--color-gray-50)]"
              >
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className={cn(
                      stickyHeader &&
                        'sticky top-0 z-10 bg-[var(--color-gray-50)]',
                    )}
                  >
                    {header.isPlaceholder ? null : (
                      <DataTableColumnHeader header={header} />
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: loadingRows }).map((_, i) => (
                <TableRow key={`skeleton-${i}`}>
                  {columns.map((_, j) => (
                    <TableCell key={`skeleton-${i}-${j}`}>
                      <Skeleton className="h-4 w-[80%]" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-32 text-center text-[var(--color-gray-400)]"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {(table.getRowModel().rows.length > 0 || paginationMeta) && (
        <DataTablePagination
          table={table}
          paginationMeta={paginationMeta}
          className={paginationClassName}
        />
      )}
    </div>
  )
}
