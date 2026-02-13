import { useCallback, useMemo } from 'react'
import {
  type ColumnDef,
  type OnChangeFn,
  type PaginationState,
} from '@tanstack/react-table'
import {
  AlertTriangle,
  FileText,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
} from 'lucide-react'
import type { ClaimInvoicesResponse } from '@friendly-system/shared'
import { Button } from '@/shared/ui/primitives/button'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/ui/primitives/card'
import { DataTable } from '@/shared/ui/composites/data-table'
import { useClaimInvoicesController } from '@/features/claims/detail/controller/use-claim-invoices-controller'
import {
  CLAIMS_ERROR_PANEL_CLASSNAME,
  CLAIMS_INLINE_SAVE_BUTTON_CLASSNAME,
} from '@/features/claims/model/claims.ui-tokens'
import { formatClaimDateTime } from '@/features/claims/model/claims.formatters'
import { ClaimInvoiceDeleteDialog } from './claim-invoice-delete-dialog'
import { ClaimInvoiceFormDialog } from './claim-invoice-form-dialog'

type ClaimInvoiceItem = ClaimInvoicesResponse['data'][number]

interface ClaimDetailInvoicesTabProps {
  claimId: string
}

function formatInvoiceAmount(value: string): string {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return value

  return numeric.toLocaleString('es', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function ClaimDetailInvoicesError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className={CLAIMS_ERROR_PANEL_CLASSNAME}>
      <div className="flex items-start gap-3">
        <span className="mt-0.5 rounded-lg bg-white p-2 text-[var(--color-red-600)] shadow-sm ring-1 ring-[var(--color-red-200)]">
          <AlertTriangle className="size-4" />
        </span>
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-[var(--color-gray-900)]">
            No pudimos cargar las facturas
          </h3>
          <p className="text-sm text-[var(--color-gray-600)]">
            Ocurrió un error al consultar la lista de facturas.
          </p>
        </div>
      </div>
      <div className="mt-4">
        <Button type="button" variant="outline" size="sm" onClick={onRetry}>
          <RefreshCw className="size-3.5" />
          Reintentar
        </Button>
      </div>
    </div>
  )
}

function ClaimDetailInvoicesEmpty() {
  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--color-gray-200)] bg-white p-8">
      <div className="mx-auto flex max-w-md flex-col items-center text-center">
        <span className="mb-3 rounded-xl bg-[var(--color-blue-50)] p-3 text-[var(--color-blue-600)]">
          <FileText className="size-5" />
        </span>
        <h3 className="text-base font-semibold text-[var(--color-gray-900)]">
          Aún no hay facturas
        </h3>
        <p className="mt-1 text-sm text-[var(--color-gray-600)]">
          Registra la primera factura para este reclamo.
        </p>
      </div>
    </div>
  )
}

export function ClaimDetailInvoicesTab({
  claimId,
}: ClaimDetailInvoicesTabProps) {
  const view = useClaimInvoicesController({ claimId })
  const { onOpenEdit } = view.formDialog
  const { onOpenDelete } = view.deleteDialog

  const {
    page,
    limit,
    totalCount,
    totalPages,
    onFirstPage,
    onLastPage,
    onNextPage,
    onPreviousPage,
    onLimitChange,
  } = view.pagination

  const columns = useMemo<ColumnDef<ClaimInvoiceItem>[]>(
    () => [
      {
        accessorKey: 'invoiceNumber',
        header: 'Nro. factura',
        enableSorting: false,
        cell: ({ row }) => (
          <span className="font-medium text-[var(--color-gray-900)]">
            {row.original.invoiceNumber}
          </span>
        ),
      },
      {
        accessorKey: 'providerName',
        header: 'Prestador',
        enableSorting: false,
      },
      {
        accessorKey: 'amountSubmitted',
        header: 'Monto',
        enableSorting: false,
        cell: ({ row }) => (
          <span className="tabular-nums font-medium text-[var(--color-gray-900)]">
            {formatInvoiceAmount(row.original.amountSubmitted)}
          </span>
        ),
      },
      {
        accessorKey: 'createdAt',
        header: 'Creado',
        enableSorting: false,
        cell: ({ row }) => (
          <span className="text-xs text-[var(--color-gray-500)]">
            {formatClaimDateTime(row.original.createdAt, 'datetime')}
          </span>
        ),
      },
      {
        id: 'actions',
        header: '',
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex justify-end gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              aria-label="Editar"
              onClick={() => onOpenEdit(row.original.id)}
            >
              <Pencil className="size-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              aria-label="Eliminar"
              onClick={() => onOpenDelete(row.original.id)}
            >
              <Trash2 className="size-3.5 text-[var(--color-red-600)]" />
            </Button>
          </div>
        ),
      },
    ],
    [onOpenEdit, onOpenDelete],
  )

  const paginationState: PaginationState = useMemo(
    () => ({ pageIndex: page - 1, pageSize: limit }),
    [page, limit],
  )

  const paginationMeta = useMemo(
    () => ({ page, limit, totalCount, totalPages }),
    [page, limit, totalCount, totalPages],
  )

  const handlePaginationChange: OnChangeFn<PaginationState> = useCallback(
    (updater) => {
      const current = { pageIndex: page - 1, pageSize: limit }
      const next = typeof updater === 'function' ? updater(current) : updater

      if (next.pageSize !== limit) {
        onLimitChange(next.pageSize)
        return
      }

      const newPage = next.pageIndex + 1
      if (newPage === page) return

      if (newPage === 1) onFirstPage()
      else if (newPage === totalPages) onLastPage()
      else if (newPage > page) onNextPage()
      else onPreviousPage()
    },
    [
      page,
      limit,
      totalPages,
      onFirstPage,
      onLastPage,
      onNextPage,
      onPreviousPage,
      onLimitChange,
    ],
  )

  return (
    <>
      <Card className="overflow-hidden">
        <div className="h-[2px] bg-gradient-to-r from-[var(--color-blue-700)] to-[var(--color-blue-500)]" />
        <CardHeader>
          <CardTitle className="text-[var(--color-gray-900)]">
            Facturas
          </CardTitle>
          <CardDescription>
            Gestiona las facturas cargadas para el reclamo.
          </CardDescription>
          <CardAction>
            <Button
              type="button"
              size="sm"
              className={CLAIMS_INLINE_SAVE_BUTTON_CLASSNAME}
              onClick={view.formDialog.onOpenCreate}
            >
              <Plus className="size-4" />
              Nueva factura
            </Button>
          </CardAction>
        </CardHeader>

        <CardContent>
          {view.list.isError ? (
            <ClaimDetailInvoicesError onRetry={view.list.onRetry} />
          ) : !view.list.isLoading && view.list.invoices.length === 0 ? (
            <ClaimDetailInvoicesEmpty />
          ) : (
            <div data-slot="claim-detail-invoices-table" className="space-y-2">
              <p
                data-slot="claim-detail-invoices-scroll-hint"
                className="text-xs text-[var(--color-gray-500)] lg:hidden"
              >
                Desliza la tabla horizontalmente para ver todas las columnas.
              </p>

              <div className="relative">
                <div
                  data-slot="claim-detail-invoices-scroll-fade"
                  className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-white to-transparent 2xl:hidden"
                />
                <DataTable
                  columns={columns}
                  data={view.list.invoices}
                  isLoading={view.list.isLoading}
                  emptyMessage="No hay facturas registradas."
                  tableClassName="min-w-[640px] lg:min-w-[780px] 2xl:min-w-[900px]"
                  tableContainerClassName="overflow-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                  manualPagination
                  pagination={paginationState}
                  onPaginationChange={handlePaginationChange}
                  paginationMeta={paginationMeta}
                  rowCount={totalCount}
                  pageSize={limit}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <ClaimInvoiceFormDialog
        open={view.formDialog.open}
        mode={view.formDialog.mode}
        draft={view.formDialog.draft}
        error={view.formDialog.error}
        isSubmitting={view.formDialog.isSubmitting}
        onOpenChange={view.formDialog.onOpenChange}
        onFieldChange={view.formDialog.onFieldChange}
        onSubmit={view.formDialog.onSubmit}
      />

      <ClaimInvoiceDeleteDialog
        open={view.deleteDialog.open}
        invoiceNumber={view.deleteDialog.invoice?.invoiceNumber}
        providerName={view.deleteDialog.invoice?.providerName}
        isDeleting={view.deleteDialog.isDeleting}
        onOpenChange={view.deleteDialog.onOpenChange}
        onConfirmDelete={view.deleteDialog.onConfirmDelete}
      />
    </>
  )
}
