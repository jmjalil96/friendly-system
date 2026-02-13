import type { LucideIcon } from 'lucide-react'
import { ClipboardList, Clock, FileText, Paperclip } from 'lucide-react'
import type { GetClientByIdResponse } from '@friendly-system/shared'
import { ViewTabs } from '@/shared/ui/composites/view-tabs'
import { ClientDetailHistoryTab } from './history/client-detail-history-tab'
import { ClientDetailRelatedRecordsTab } from './related/client-detail-related-records-tab'
import { ClientDetailMainTab } from './client-detail-main-tab'

interface ClientDetailTabPlaceholderProps {
  icon: LucideIcon
  title: string
  description: string
}

function ClientDetailTabPlaceholder({
  icon: Icon,
  title,
  description,
}: ClientDetailTabPlaceholderProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--color-gray-300)] bg-[var(--color-gray-50)] px-6 py-16 text-center">
      <div className="mb-3 rounded-lg bg-white p-2.5 shadow-sm ring-1 ring-[var(--color-gray-200)]">
        <Icon className="size-5 text-[var(--color-gray-400)]" />
      </div>
      <p className="text-sm font-medium text-[var(--color-gray-700)]">
        {title}
      </p>
      <p className="mt-1 max-w-xs text-[0.8rem] text-[var(--color-gray-500)]">
        {description}
      </p>
    </div>
  )
}

export interface ClientDetailTabsProps {
  clientId: string
  client?: GetClientByIdResponse
  isLoading: boolean
  isError: boolean
  onRetry: () => void | Promise<void>
}

export function ClientDetailTabs({
  clientId,
  client,
  isLoading,
  isError,
  onRetry,
}: ClientDetailTabsProps) {
  return (
    <ViewTabs defaultValue="principal">
      <div data-slot="client-detail-tabs-list-shell" className="space-y-2">
        <p
          data-slot="client-detail-tabs-scroll-hint"
          className="text-xs text-[var(--color-gray-500)] lg:hidden"
        >
          Desliza las pestañas para ver todas las secciones.
        </p>

        <div className="relative">
          <div
            data-slot="client-detail-tabs-scroll-fade"
            className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-white to-transparent 2xl:hidden"
          />
          <ViewTabs.List>
            <ViewTabs.Trigger value="principal">
              <ClipboardList className="hidden size-4 sm:inline" />
              Principal
            </ViewTabs.Trigger>
            <ViewTabs.Trigger value="documentos">
              <Paperclip className="hidden size-4 sm:inline" />
              Documentos
            </ViewTabs.Trigger>
            <ViewTabs.Trigger value="historial">
              <Clock className="hidden size-4 sm:inline" />
              Historial
            </ViewTabs.Trigger>
            <ViewTabs.Trigger value="relacionados">
              <FileText className="hidden size-4 sm:inline" />
              Registros relacionados
            </ViewTabs.Trigger>
          </ViewTabs.List>
        </div>
      </div>

      <ViewTabs.Content value="principal">
        <ClientDetailMainTab
          clientId={clientId}
          client={client}
          isLoading={isLoading}
          isError={isError}
          onRetry={onRetry}
        />
      </ViewTabs.Content>

      <ViewTabs.Content value="documentos">
        <ClientDetailTabPlaceholder
          icon={Paperclip}
          title="Documentos"
          description="En la siguiente iteración se habilitarán cargas y gestión documental del cliente."
        />
      </ViewTabs.Content>

      <ViewTabs.Content value="historial">
        <ClientDetailHistoryTab clientId={clientId} />
      </ViewTabs.Content>

      <ViewTabs.Content value="relacionados">
        <ClientDetailRelatedRecordsTab clientId={clientId} />
      </ViewTabs.Content>
    </ViewTabs>
  )
}
