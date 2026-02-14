import { useMemo } from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import { Link } from '@tanstack/react-router'
import { AlertTriangle, FileText, RefreshCw, Search } from 'lucide-react'
import type { ClientPoliciesResponse } from '@friendly-system/shared'
import { Button } from '@/shared/ui/primitives/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/ui/primitives/card'
import { DataTable } from '@/shared/ui/composites/data-table'
import { Input } from '@/shared/ui/primitives/input'
import { useClientPoliciesController } from '@/features/clients/detail/controller/use-client-policies-controller'
import { CLIENTS_ERROR_PANEL_CLASSNAME } from '@/features/clients/model/clients.ui-tokens'
import { formatClientDateOnly } from '@/features/clients/model/clients.formatters'

type ClientPolicyItem = ClientPoliciesResponse['data'][number]

interface ClientDetailRelatedRecordsTabProps {
  clientId: string
}

function formatPolicyType(value: ClientPolicyItem['type']): string {
  if (value === null) return 'Sin tipo'
  if (value === 'HEALTH') return 'Salud'
  if (value === 'LIFE') return 'Vida'
  if (value === 'ACCIDENTS') return 'Accidentes'
  return value
}

function formatPolicyStatus(value: ClientPolicyItem['status']): string {
  if (value === 'PENDING') return 'Pendiente'
  if (value === 'ACTIVE') return 'Activa'
  if (value === 'SUSPENDED') return 'Suspendida'
  if (value === 'EXPIRED') return 'Expirada'
  if (value === 'CANCELLED') return 'Cancelada'
  return value
}

function formatDecimalValue(value: string | null): string {
  if (!value) return 'Sin dato'
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return value
  return numeric.toLocaleString('es', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function RelatedPoliciesError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className={CLIENTS_ERROR_PANEL_CLASSNAME}>
      <div className="flex items-start gap-3">
        <span className="mt-0.5 rounded-lg bg-white p-2 text-[var(--color-red-600)] shadow-sm ring-1 ring-[var(--color-red-200)]">
          <AlertTriangle className="size-4" />
        </span>
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-[var(--color-gray-900)]">
            No pudimos cargar las pólizas
          </h3>
          <p className="text-sm text-[var(--color-gray-600)]">
            Ocurrió un error al consultar los registros relacionados.
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

function RelatedPoliciesEmpty() {
  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--color-gray-200)] bg-white p-8">
      <div className="mx-auto flex max-w-md flex-col items-center text-center">
        <span className="mb-3 rounded-xl bg-[var(--color-blue-50)] p-3 text-[var(--color-blue-600)]">
          <FileText className="size-5" />
        </span>
        <h3 className="text-base font-semibold text-[var(--color-gray-900)]">
          No hay pólizas relacionadas
        </h3>
        <p className="mt-1 text-sm text-[var(--color-gray-600)]">
          Cuando este cliente tenga pólizas asociadas aparecerán aquí.
        </p>
      </div>
    </div>
  )
}

export function ClientDetailRelatedRecordsTab({
  clientId,
}: ClientDetailRelatedRecordsTabProps) {
  const view = useClientPoliciesController({ clientId })

  const columns = useMemo<ColumnDef<ClientPolicyItem>[]>(
    () => [
      {
        accessorKey: 'policyNumber',
        header: 'Nro. póliza',
        enableSorting: false,
        cell: ({ row }) => (
          <Link
            to="/polizas/$id"
            params={{ id: row.original.id }}
            className="font-medium text-[var(--color-gray-900)] underline-offset-2 hover:underline"
          >
            {row.original.policyNumber}
          </Link>
        ),
      },
      {
        accessorKey: 'type',
        header: 'Tipo',
        enableSorting: false,
        cell: ({ row }) => formatPolicyType(row.original.type),
      },
      {
        accessorKey: 'status',
        header: 'Estado',
        enableSorting: false,
        cell: ({ row }) => formatPolicyStatus(row.original.status),
      },
      {
        accessorKey: 'planName',
        header: 'Plan',
        enableSorting: false,
        cell: ({ row }) => row.original.planName ?? 'Sin dato',
      },
      {
        accessorKey: 'employeeClass',
        header: 'Clase',
        enableSorting: false,
        cell: ({ row }) => row.original.employeeClass ?? 'Sin dato',
      },
      {
        accessorKey: 'maxCoverage',
        header: 'Cobertura máx.',
        enableSorting: false,
        cell: ({ row }) => formatDecimalValue(row.original.maxCoverage),
      },
      {
        accessorKey: 'deductible',
        header: 'Deducible',
        enableSorting: false,
        cell: ({ row }) => formatDecimalValue(row.original.deductible),
      },
      {
        accessorKey: 'startDate',
        header: 'Inicio',
        enableSorting: false,
        cell: ({ row }) => formatClientDateOnly(row.original.startDate),
      },
      {
        accessorKey: 'endDate',
        header: 'Fin',
        enableSorting: false,
        cell: ({ row }) => formatClientDateOnly(row.original.endDate),
      },
      {
        accessorKey: 'insurerName',
        header: 'Aseguradora',
        enableSorting: false,
      },
    ],
    [],
  )

  return (
    <Card className="overflow-hidden">
      <div className="h-[2px] bg-gradient-to-r from-[var(--color-blue-700)] to-[var(--color-blue-500)]" />
      <CardHeader>
        <CardTitle className="text-[var(--color-gray-900)]">Pólizas</CardTitle>
        <CardDescription>
          Consulta las pólizas relacionadas al cliente (solo lectura).
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="relative w-full sm:max-w-sm">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[var(--color-gray-400)]" />
          <Input
            value={view.searchInput}
            onChange={(event) => view.onSearchInputChange(event.target.value)}
            placeholder="Buscar por número de póliza..."
            className="h-8 pl-8 text-sm"
            aria-label="Buscar póliza"
          />
        </div>

        {view.isError ? (
          <RelatedPoliciesError onRetry={view.onRetry} />
        ) : !view.isLoading && view.items.length === 0 ? (
          <RelatedPoliciesEmpty />
        ) : (
          <div data-slot="client-related-policies-table" className="space-y-2">
            <p
              data-slot="client-related-policies-scroll-hint"
              className="text-xs text-[var(--color-gray-500)] lg:hidden"
            >
              Desliza la tabla horizontalmente para ver todas las columnas.
            </p>

            <div className="relative">
              <div
                data-slot="client-related-policies-scroll-fade"
                className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-white to-transparent 2xl:hidden"
              />
              <DataTable
                columns={columns}
                data={view.items}
                isLoading={view.isLoading}
                emptyMessage="No hay pólizas registradas."
                tableClassName="min-w-[980px] lg:min-w-[1240px] 2xl:min-w-[1420px]"
                tableContainerClassName="overflow-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                manualPagination
                pagination={view.pagination}
                onPaginationChange={view.onPaginationChange}
                paginationMeta={view.paginationMeta}
                rowCount={view.paginationMeta?.totalCount}
                pageSize={view.pagination.pageSize}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
