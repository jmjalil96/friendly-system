import { AlertTriangle, RefreshCw } from 'lucide-react'
import type { GetInsurerByIdResponse } from '@friendly-system/shared'
import { Button } from '@/shared/ui/primitives/button'
import { Card, CardContent, CardHeader } from '@/shared/ui/primitives/card'
import { Skeleton } from '@/shared/ui/primitives/skeleton'
import { useInsurerDetailMainController } from '@/features/insurers/detail/controller/use-insurer-detail-main-controller'
import { INSURERS_ERROR_PANEL_CLASSNAME } from '@/features/insurers/model/insurers.ui-tokens'
import { InsurerDetailMainLayout } from './insurer-detail-main-layout'
import { InsurerDetailMainSections } from './insurer-detail-main-sections'
import { InsurerDetailSummaryCard } from './insurer-detail-summary-card'

export interface InsurerDetailMainTabProps {
  insurerId: string
  insurer?: GetInsurerByIdResponse
  isLoading: boolean
  isError: boolean
  onRetry: () => void | Promise<void>
}

function InsurerDetailMainSkeleton() {
  return (
    <div className="grid gap-6 xl:grid-cols-12">
      <div className="space-y-6 xl:col-span-8">
        <Card className="overflow-hidden">
          <div className="h-[2px] bg-[var(--color-gray-100)]" />
          <CardHeader>
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-72" />
          </CardHeader>
          <CardContent>
            <div className="grid gap-1 md:grid-cols-2">
              {Array.from({ length: 6 }).map((_, itemIndex) => (
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

function InsurerDetailMainError({
  onRetry,
}: Pick<InsurerDetailMainTabProps, 'onRetry'>) {
  return (
    <div className={INSURERS_ERROR_PANEL_CLASSNAME}>
      <div className="flex items-start gap-3">
        <span className="mt-0.5 rounded-lg bg-white p-2 text-[var(--color-red-600)] shadow-sm ring-1 ring-[var(--color-red-200)]">
          <AlertTriangle className="size-4" />
        </span>
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-[var(--color-gray-900)]">
            No pudimos cargar la vista principal
          </h3>
          <p className="text-sm text-[var(--color-gray-600)]">
            Ocurrió un error al obtener el detalle de la aseguradora.
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

export function InsurerDetailMainTab({
  insurerId,
  insurer,
  isLoading,
  isError,
  onRetry,
}: InsurerDetailMainTabProps) {
  const view = useInsurerDetailMainController({ insurerId, insurer })

  if (isLoading) return <InsurerDetailMainSkeleton />
  if (isError) return <InsurerDetailMainError onRetry={onRetry} />

  if (!insurer) {
    return (
      <div className="rounded-xl border border-[var(--color-gray-200)] bg-white p-6 text-sm text-[var(--color-gray-600)]">
        No encontramos datos de la aseguradora.
      </div>
    )
  }

  return (
    <InsurerDetailMainLayout
      sections={<InsurerDetailMainSections sections={view.sections} />}
      sidebar={<InsurerDetailSummaryCard items={view.summary.items} />}
    />
  )
}
