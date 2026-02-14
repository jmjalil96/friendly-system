import { AlertTriangle, Clock, RefreshCw } from 'lucide-react'
import { Button } from '@/shared/ui/primitives/button'
import { ScrollArea } from '@/shared/ui/primitives/scroll-area'
import { Skeleton } from '@/shared/ui/primitives/skeleton'
import { usePolicyHistoryController } from '@/features/policies/detail/controller/use-policy-history-controller'
import { POLICIES_ERROR_PANEL_CLASSNAME } from '@/features/policies/model/policies.ui-tokens'
import { PolicyHistoryPaginationControls } from './policy-history-pagination-controls'
import { PolicyHistorySectionCard } from './policy-history-section-card'
import { PolicyHistoryTimelineItemCard } from './policy-history-timeline-item-card'
import { PolicyHistoryTransitionItemCard } from './policy-history-transition-item-card'

interface PolicyDetailHistoryTabProps {
  policyId: string
}

function PolicyHistorySectionSkeleton() {
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

function PolicyHistorySectionError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className={POLICIES_ERROR_PANEL_CLASSNAME}>
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

function PolicyHistorySectionEmpty({
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

export function PolicyDetailHistoryTab({
  policyId,
}: PolicyDetailHistoryTabProps) {
  const view = usePolicyHistoryController({ policyId })

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <PolicyHistorySectionCard
        title="Transiciones"
        subtitle="Cambios de estado de la póliza."
      >
        {view.historySection.isError ? (
          <PolicyHistorySectionError onRetry={view.historySection.onRetry} />
        ) : view.historySection.isLoading ? (
          <PolicyHistorySectionSkeleton />
        ) : view.historySection.items.length === 0 ? (
          <PolicyHistorySectionEmpty
            title="Sin transiciones registradas"
            description="Cuando el estado de la póliza cambie, verás los registros aquí."
          />
        ) : (
          <>
            <ScrollArea className="h-[clamp(14rem,45dvh,26rem)] rounded-[var(--radius-md)] border border-[var(--color-gray-200)]">
              <div className="space-y-2 p-3">
                {view.historySection.items.map((item) => (
                  <PolicyHistoryTransitionItemCard
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

            <PolicyHistoryPaginationControls
              entityLabel="transiciones"
              {...view.historySection.pagination}
            />
          </>
        )}
      </PolicyHistorySectionCard>

      <PolicyHistorySectionCard
        title="Actividad"
        subtitle="Eventos de auditoría y acciones relacionadas."
      >
        {view.timelineSection.isError ? (
          <PolicyHistorySectionError onRetry={view.timelineSection.onRetry} />
        ) : view.timelineSection.isLoading ? (
          <PolicyHistorySectionSkeleton />
        ) : view.timelineSection.items.length === 0 ? (
          <PolicyHistorySectionEmpty
            title="Sin actividad registrada"
            description="Los eventos de la póliza aparecerán en esta sección."
          />
        ) : (
          <>
            <ScrollArea className="h-[clamp(14rem,45dvh,26rem)] rounded-[var(--radius-md)] border border-[var(--color-gray-200)]">
              <div className="space-y-2 p-3">
                {view.timelineSection.items.map((item) => (
                  <PolicyHistoryTimelineItemCard
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

            <PolicyHistoryPaginationControls
              entityLabel="actividad"
              {...view.timelineSection.pagination}
            />
          </>
        )}
      </PolicyHistorySectionCard>
    </div>
  )
}
