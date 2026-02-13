import { AlertTriangle, RefreshCw } from 'lucide-react'
import type { GetClientByIdResponse } from '@friendly-system/shared'
import { Button } from '@/shared/ui/primitives/button'
import { Card, CardContent, CardHeader } from '@/shared/ui/primitives/card'
import { Skeleton } from '@/shared/ui/primitives/skeleton'
import { useClientDetailMainController } from '@/features/clients/detail/controller/use-client-detail-main-controller'
import { CLIENTS_ERROR_PANEL_CLASSNAME } from '@/features/clients/model/clients.ui-tokens'
import { ClientDetailMainLayout } from './client-detail-main-layout'
import { ClientDetailMainSections } from './client-detail-main-sections'
import { ClientDetailSummaryCard } from './client-detail-summary-card'

export interface ClientDetailMainTabProps {
  clientId: string
  client?: GetClientByIdResponse
  isLoading: boolean
  isError: boolean
  onRetry: () => void | Promise<void>
}

function ClientDetailMainSkeleton() {
  return (
    <div className="grid gap-6 xl:grid-cols-12">
      <div className="space-y-6 xl:col-span-8">
        <Card className="overflow-hidden">
          <div className="h-[2px] bg-[var(--color-gray-100)]" />
          <CardHeader>
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent>
            <div className="grid gap-1 md:grid-cols-2">
              {Array.from({ length: 2 }).map((_, itemIndex) => (
                <Skeleton
                  key={itemIndex}
                  className="h-16 w-full rounded-[var(--radius-md)]"
                />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
      <div className="space-y-6 xl:col-span-4">
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-24" />
          </CardHeader>
          <CardContent className="space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-10 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function ClientDetailMainError({
  onRetry,
}: Pick<ClientDetailMainTabProps, 'onRetry'>) {
  return (
    <div className={CLIENTS_ERROR_PANEL_CLASSNAME}>
      <div className="flex items-start gap-3">
        <span className="mt-0.5 rounded-lg bg-white p-2 text-[var(--color-red-600)] shadow-sm ring-1 ring-[var(--color-red-200)]">
          <AlertTriangle className="size-4" />
        </span>
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-[var(--color-gray-900)]">
            No pudimos cargar la vista principal
          </h3>
          <p className="text-sm text-[var(--color-gray-600)]">
            Ocurrió un error al obtener el detalle del cliente.
          </p>
        </div>
      </div>
      <div className="mt-4">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void onRetry()}
        >
          <RefreshCw className="size-3.5" />
          Reintentar
        </Button>
      </div>
    </div>
  )
}

export function ClientDetailMainTab({
  clientId,
  client,
  isLoading,
  isError,
  onRetry,
}: ClientDetailMainTabProps) {
  const view = useClientDetailMainController({ clientId, client })

  if (isLoading) return <ClientDetailMainSkeleton />
  if (isError) return <ClientDetailMainError onRetry={onRetry} />

  if (!client) {
    return (
      <div className="rounded-xl border border-[var(--color-gray-200)] bg-white p-6 text-sm text-[var(--color-gray-600)]">
        No encontramos datos del cliente.
      </div>
    )
  }

  return (
    <ClientDetailMainLayout
      sections={<ClientDetailMainSections sections={view.sections} />}
      sidebar={<ClientDetailSummaryCard items={view.summary.items} />}
    />
  )
}
