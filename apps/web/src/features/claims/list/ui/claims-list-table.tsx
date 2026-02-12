import { useMemo } from 'react'
import { AlertTriangle, Inbox, RefreshCw } from 'lucide-react'
import { type OnChangeFn, type PaginationState, type SortingState, type ColumnDef } from '@tanstack/react-table'
import { Link } from '@tanstack/react-router'
import { type ListClaimsItem, type ListClaimsResponse } from '@friendly-system/shared'
import { Button } from '@/shared/ui/primitives/button'
import { DataTable } from '@/shared/ui/composites/data-table'
import { formatClaimDateTime } from '@/features/claims/model/claims.formatters'
import { CLAIMS_ERROR_PANEL_CLASSNAME } from '@/features/claims/model/claims.ui-tokens'
import { cn } from '@/shared/lib/cn'
import {
  CLAIM_STATUS_BADGE_CLASSNAMES,
  CLAIM_STATUS_LABELS,
} from '@/features/claims/model/claims.status'

export interface ClaimsListTableProps {
  data: ListClaimsItem[]
  isLoading: boolean
  sorting: SortingState
  onSortingChange: OnChangeFn<SortingState>
  pagination: PaginationState
  onPaginationChange: OnChangeFn<PaginationState>
  paginationMeta?: ListClaimsResponse['meta']
  isError?: boolean
  onRetry?: () => void | Promise<void>
  hasActiveFilters?: boolean
  onClearFilters?: () => void
}

export function ClaimsListTable({
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
}: ClaimsListTableProps) {
  const columns = useMemo<ColumnDef<ListClaimsItem>[]>(
    () => [
      {
        accessorKey: 'claimNumber',
        header: 'Nro',
        cell: ({ row }) => (
          <Link
            to="/reclamos/$id"
            params={{ id: row.original.id }}
            className="font-medium text-[var(--color-gray-900)] underline-offset-2 hover:underline"
          >
            #{row.original.claimNumber}
          </Link>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Estado',
        enableSorting: false,
        cell: ({ row }) => {
          const status = row.original.status
          return (
            <span
              className={cn(
                'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                CLAIM_STATUS_BADGE_CLASSNAMES[status],
              )}
            >
              {CLAIM_STATUS_LABELS[status]}
            </span>
          )
        },
      },
      {
        accessorKey: 'clientName',
        header: 'Cliente',
        enableSorting: false,
      },
      {
        id: 'affiliateName',
        header: 'Afiliado',
        enableSorting: false,
        cell: ({ row }) => (
          <span>{row.original.affiliateFirstName} {row.original.affiliateLastName}</span>
        ),
      },
      {
        id: 'patientName',
        header: 'Paciente',
        enableSorting: false,
        cell: ({ row }) => (
          <span>{row.original.patientFirstName} {row.original.patientLastName}</span>
        ),
      },
      {
        accessorKey: 'description',
        header: 'Descripción',
        enableSorting: false,
        cell: ({ row }) => (
          <span className="block max-w-[220px] truncate text-[var(--color-gray-600)]">
            {row.original.description}
          </span>
        ),
      },
      {
        accessorKey: 'createdAt',
        header: 'Creado',
        cell: ({ row }) => (
          <span className="text-xs text-[var(--color-gray-500)]">
            {formatClaimDateTime(row.original.createdAt, 'date')}
          </span>
        ),
      },
      {
        accessorKey: 'updatedAt',
        header: 'Actualizado',
        cell: ({ row }) => (
          <span className="text-xs text-[var(--color-gray-500)]">
            {formatClaimDateTime(row.original.updatedAt, 'date')}
          </span>
        ),
      },
    ],
    [],
  )

  if (isError) {
    return (
      <div className={CLAIMS_ERROR_PANEL_CLASSNAME}>
        <div className="flex items-start gap-3">
          <span className="mt-0.5 rounded-md bg-[var(--color-red-50)] p-2 text-[var(--color-red-600)]">
            <AlertTriangle className="size-4" />
          </span>
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-[var(--color-gray-900)]">
              No pudimos cargar los reclamos
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
            No hay reclamos para mostrar
          </h3>
          <p className="mt-1 text-sm text-[var(--color-gray-600)]">
            {hasActiveFilters
              ? 'No encontramos resultados con los filtros actuales. Ajusta o limpia los filtros para continuar.'
              : 'Cuando se creen reclamos aparecerán aquí.'}
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
          emptyMessage="No hay reclamos para los filtros seleccionados."
          className="space-y-3"
          tableClassName="min-w-[720px] xl:min-w-[980px] 2xl:min-w-[1120px]"
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
