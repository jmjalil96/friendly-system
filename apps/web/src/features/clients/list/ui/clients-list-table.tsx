import { useMemo } from 'react'
import { AlertTriangle, Inbox, RefreshCw } from 'lucide-react'
import {
  type ColumnDef,
  type OnChangeFn,
  type PaginationState,
  type SortingState,
} from '@tanstack/react-table'
import { Link } from '@tanstack/react-router'
import type {
  ListClientsItem,
  ListClientsResponse,
} from '@friendly-system/shared'
import { Button } from '@/shared/ui/primitives/button'
import { DataTable } from '@/shared/ui/composites/data-table'
import { formatClientDateTime } from '@/features/clients/model/clients.formatters'
import { CLIENTS_ERROR_PANEL_CLASSNAME } from '@/features/clients/model/clients.ui-tokens'
import { cn } from '@/shared/lib/cn'

export interface ClientsListTableProps {
  data: ListClientsItem[]
  isLoading: boolean
  sorting: SortingState
  onSortingChange: OnChangeFn<SortingState>
  pagination: PaginationState
  onPaginationChange: OnChangeFn<PaginationState>
  paginationMeta?: ListClientsResponse['meta']
  isError?: boolean
  onRetry?: () => void | Promise<void>
  hasActiveFilters?: boolean
  onClearFilters?: () => void
}

export function ClientsListTable({
  data,
  isLoading,
  sorting,
  onSortingChange,
  pagination,
  onPaginationChange,
  paginationMeta,
  isError = false,
  onRetry,
  hasActiveFilters = false,
  onClearFilters,
}: ClientsListTableProps) {
  const columns = useMemo<ColumnDef<ListClientsItem>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Cliente',
        cell: ({ row }) => (
          <Link
            to="/clientes/$id"
            params={{ id: row.original.id }}
            className="font-medium text-[var(--color-gray-900)] underline-offset-2 hover:underline"
          >
            {row.original.name}
          </Link>
        ),
      },
      {
        accessorKey: 'isActive',
        header: 'Estado',
        cell: ({ row }) => (
          <span
            className={cn(
              'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold',
              row.original.isActive
                ? 'bg-[var(--color-green-50)] text-[var(--color-green-700)]'
                : 'bg-[var(--color-gray-100)] text-[var(--color-gray-700)]',
            )}
          >
            {row.original.isActive ? 'Activo' : 'Inactivo'}
          </span>
        ),
      },
      {
        accessorKey: 'createdAt',
        header: 'Creado',
        cell: ({ row }) => (
          <span className="text-xs text-[var(--color-gray-500)]">
            {formatClientDateTime(row.original.createdAt, 'date')}
          </span>
        ),
      },
      {
        accessorKey: 'updatedAt',
        header: 'Actualizado',
        cell: ({ row }) => (
          <span className="text-xs text-[var(--color-gray-500)]">
            {formatClientDateTime(row.original.updatedAt, 'date')}
          </span>
        ),
      },
    ],
    [],
  )

  if (isError) {
    return (
      <div className={CLIENTS_ERROR_PANEL_CLASSNAME}>
        <div className="flex items-start gap-3">
          <span className="mt-0.5 rounded-md bg-[var(--color-red-50)] p-2 text-[var(--color-red-600)]">
            <AlertTriangle className="size-4" />
          </span>
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-[var(--color-gray-900)]">
              No pudimos cargar los clientes
            </h3>
            <p className="text-sm text-[var(--color-gray-600)]">
              Ocurrió un error al obtener la lista. Intenta nuevamente.
            </p>
          </div>
        </div>
        <div className="mt-4">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void onRetry?.()}
          >
            <RefreshCw className="size-3.5" />
            Reintentar
          </Button>
        </div>
      </div>
    )
  }

  if (!isLoading && data.length === 0) {
    return (
      <div className="rounded-[var(--radius-md)] border border-[var(--color-gray-200)] bg-white p-8">
        <div className="mx-auto flex max-w-md flex-col items-center text-center">
          <span className="mb-3 rounded-xl bg-[var(--color-blue-50)] p-3 text-[var(--color-blue-600)]">
            <Inbox className="size-5" />
          </span>
          <h3 className="text-base font-semibold text-[var(--color-gray-900)]">
            No hay clientes para mostrar
          </h3>
          <p className="mt-1 text-sm text-[var(--color-gray-600)]">
            {hasActiveFilters
              ? 'No encontramos resultados con los filtros actuales. Ajusta o limpia los filtros para continuar.'
              : 'Cuando se creen clientes aparecerán aquí.'}
          </p>
          {hasActiveFilters && onClearFilters ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClearFilters}
              className="mt-4"
            >
              Limpiar filtros
            </Button>
          ) : null}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-[var(--color-gray-500)] xl:hidden">
        Desliza la tabla horizontalmente para ver todas las columnas.
      </p>

      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-white to-transparent 2xl:hidden" />
        <DataTable
          columns={columns}
          data={data}
          isLoading={isLoading}
          emptyMessage="No hay clientes para los filtros seleccionados."
          className="space-y-3"
          tableClassName="min-w-[680px] xl:min-w-[920px] 2xl:min-w-[1060px]"
          tableContainerClassName="overflow-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden xl:max-h-[72vh] 2xl:max-h-[78vh]"
          stickyHeader
          sorting={sorting}
          onSortingChange={onSortingChange}
          manualSorting
          pagination={pagination}
          onPaginationChange={onPaginationChange}
          manualPagination
          paginationMeta={paginationMeta}
          rowCount={paginationMeta?.totalCount}
          pageSize={pagination.pageSize}
        />
      </div>
    </div>
  )
}
