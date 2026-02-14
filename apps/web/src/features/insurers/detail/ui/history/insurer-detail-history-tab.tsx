import { AlertTriangle, Clock, RefreshCw } from 'lucide-react'
import { Button } from '@/shared/ui/primitives/button'
import { ScrollArea } from '@/shared/ui/primitives/scroll-area'
import { Skeleton } from '@/shared/ui/primitives/skeleton'
import { useInsurerHistoryController } from '@/features/insurers/detail/controller/use-insurer-history-controller'
import { INSURERS_ERROR_PANEL_CLASSNAME } from '@/features/insurers/model/insurers.ui-tokens'
import { InsurerHistoryPaginationControls } from './insurer-history-pagination-controls'
import { InsurerHistorySectionCard } from './insurer-history-section-card'
import { InsurerHistoryTimelineItemCard } from './insurer-history-timeline-item-card'

interface InsurerDetailHistoryTabProps {
  insurerId: string
}

function InsurerHistorySectionSkeleton() {
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

function InsurerHistorySectionError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className={INSURERS_ERROR_PANEL_CLASSNAME}>
      <div className="flex items-start gap-3">
        <span className="mt-0.5 rounded-lg bg-white p-2 text-[var(--color-red-600)] shadow-sm ring-1 ring-[var(--color-red-200)]">
          <AlertTriangle className="size-4" />
        </span>
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-[var(--color-gray-900)]">
            No pudimos cargar esta sección
          </h3>
          <p className="text-sm text-[var(--color-gray-600)]">
            Ocurrió un error al consultar el historial.
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

function InsurerHistorySectionEmpty() {
  return (
    <div className="rounded-[var(--radius-md)] border border-dashed border-[var(--color-gray-300)] bg-[var(--color-gray-50)] px-6 py-8 text-center">
      <div className="mx-auto mb-3 flex size-9 items-center justify-center rounded-lg bg-white shadow-sm ring-1 ring-[var(--color-gray-200)]">
        <Clock className="size-4 text-[var(--color-gray-400)]" />
      </div>
      <p className="text-sm font-semibold text-[var(--color-gray-900)]">
        Sin actividad registrada
      </p>
      <p className="mt-1 text-sm text-[var(--color-gray-600)]">
        Los eventos de la aseguradora aparecerán en esta sección.
      </p>
    </div>
  )
}

export function InsurerDetailHistoryTab({
  insurerId,
}: InsurerDetailHistoryTabProps) {
  const view = useInsurerHistoryController({ insurerId })

  return (
    <InsurerHistorySectionCard
      title="Actividad"
      subtitle="Eventos de auditoría asociados a la aseguradora."
    >
      {view.isError ? (
        <InsurerHistorySectionError onRetry={view.onRetry} />
      ) : view.isLoading ? (
        <InsurerHistorySectionSkeleton />
      ) : view.items.length === 0 ? (
        <InsurerHistorySectionEmpty />
      ) : (
        <>
          <ScrollArea className="h-[clamp(14rem,45dvh,30rem)] rounded-[var(--radius-md)] border border-[var(--color-gray-200)]">
            <div className="space-y-2 p-3">
              {view.items.map((item) => (
                <InsurerHistoryTimelineItemCard
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

          <InsurerHistoryPaginationControls
            entityLabel="actividad"
            {...view.pagination}
          />
        </>
      )}
    </InsurerHistorySectionCard>
  )
}
