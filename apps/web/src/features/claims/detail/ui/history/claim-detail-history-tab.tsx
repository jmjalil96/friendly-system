import { AlertTriangle, Clock, RefreshCw } from 'lucide-react'
import { Button } from '@/shared/ui/primitives/button'
import { ScrollArea } from '@/shared/ui/primitives/scroll-area'
import { Skeleton } from '@/shared/ui/primitives/skeleton'
import { useClaimHistoryController } from '@/features/claims/detail/controller/use-claim-history-controller'
import { CLAIMS_ERROR_PANEL_CLASSNAME } from '@/features/claims/model/claims.ui-tokens'
import { ClaimHistoryPaginationControls } from './claim-history-pagination-controls'
import { ClaimHistorySectionCard } from './claim-history-section-card'
import { ClaimHistoryTimelineItemCard } from './claim-history-timeline-item-card'
import { ClaimHistoryTransitionItemCard } from './claim-history-transition-item-card'

interface ClaimDetailHistoryTabProps {
  claimId: string
}

function ClaimHistorySectionSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="rounded-[var(--radius-md)] border border-[var(--color-gray-200)] bg-white px-3 py-2.5"
        >
          <Skeleton className="h-4 w-40" />
          <Skeleton className="mt-2 h-3 w-56" />
          <Skeleton className="mt-2 h-3 w-3/4" />
        </div>
      ))}
    </div>
  )
}

function ClaimHistorySectionError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className={CLAIMS_ERROR_PANEL_CLASSNAME}>
      <div className="flex items-start gap-3">
        <span className="mt-0.5 rounded-lg bg-white p-2 text-[var(--color-red-600)] shadow-sm ring-1 ring-[var(--color-red-200)]">
          <AlertTriangle className="size-4" />
        </span>
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-[var(--color-gray-900)]">
            No pudimos cargar esta sección
          </h3>
          <p className="text-sm text-[var(--color-gray-600)]">
            Ocurrió un error al consultar los registros.
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

function ClaimHistorySectionEmpty({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <div className="rounded-[var(--radius-md)] border border-dashed border-[var(--color-gray-300)] bg-[var(--color-gray-50)] px-6 py-8 text-center">
      <div className="mx-auto mb-3 flex size-9 items-center justify-center rounded-lg bg-white shadow-sm ring-1 ring-[var(--color-gray-200)]">
        <Clock className="size-4 text-[var(--color-gray-400)]" />
      </div>
      <p className="text-sm font-semibold text-[var(--color-gray-900)]">
        {title}
      </p>
      <p className="mt-1 text-sm text-[var(--color-gray-600)]">{description}</p>
    </div>
  )
}

export function ClaimDetailHistoryTab({ claimId }: ClaimDetailHistoryTabProps) {
  const view = useClaimHistoryController({ claimId })

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <ClaimHistorySectionCard
        title="Transiciones"
        subtitle="Cambios de estado del reclamo."
      >
        {view.historySection.isError ? (
          <ClaimHistorySectionError onRetry={view.historySection.onRetry} />
        ) : view.historySection.isLoading ? (
          <ClaimHistorySectionSkeleton />
        ) : view.historySection.items.length === 0 ? (
          <ClaimHistorySectionEmpty
            title="Sin transiciones registradas"
            description="Cuando el estado del reclamo cambie, verás los registros aquí."
          />
        ) : (
          <>
            <ScrollArea className="h-[clamp(14rem,45dvh,26rem)] rounded-[var(--radius-md)] border border-[var(--color-gray-200)]">
              <div className="space-y-2 p-3">
                {view.historySection.items.map((item) => (
                  <ClaimHistoryTransitionItemCard
                    key={item.id}
                    fromStatusLabel={item.fromStatusLabel}
                    toStatusLabel={item.toStatusLabel}
                    createdAtLabel={item.createdAtLabel}
                    createdByLabel={item.createdByLabel}
                    reason={item.reason}
                    notes={item.notes}
                  />
                ))}
              </div>
            </ScrollArea>

            <ClaimHistoryPaginationControls
              entityLabel="transiciones"
              {...view.historySection.pagination}
            />
          </>
        )}
      </ClaimHistorySectionCard>

      <ClaimHistorySectionCard
        title="Actividad"
        subtitle="Eventos de auditoría y acciones relacionadas."
      >
        {view.timelineSection.isError ? (
          <ClaimHistorySectionError onRetry={view.timelineSection.onRetry} />
        ) : view.timelineSection.isLoading ? (
          <ClaimHistorySectionSkeleton />
        ) : view.timelineSection.items.length === 0 ? (
          <ClaimHistorySectionEmpty
            title="Sin actividad registrada"
            description="Los eventos del reclamo aparecerán en esta sección."
          />
        ) : (
          <>
            <ScrollArea className="h-[clamp(14rem,45dvh,26rem)] rounded-[var(--radius-md)] border border-[var(--color-gray-200)]">
              <div className="space-y-2 p-3">
                {view.timelineSection.items.map((item) => (
                  <ClaimHistoryTimelineItemCard
                    key={item.id}
                    actionLabel={item.actionLabel}
                    actionToneClassName={item.actionToneClassName}
                    createdAtLabel={item.createdAtLabel}
                    userLabel={item.userLabel}
                    metadataLines={item.metadataLines}
                  />
                ))}
              </div>
            </ScrollArea>

            <ClaimHistoryPaginationControls
              entityLabel="actividad"
              {...view.timelineSection.pagination}
            />
          </>
        )}
      </ClaimHistorySectionCard>
    </div>
  )
}
