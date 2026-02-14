import type { LucideIcon } from 'lucide-react'
import { ClipboardList, Clock, Paperclip } from 'lucide-react'
import type { GetPolicyByIdResponse } from '@friendly-system/shared'
import { ViewTabs } from '@/shared/ui/composites/view-tabs'
import { PolicyDetailMainTab } from './policy-detail-main-tab'
import { PolicyDetailHistoryTab } from './history/policy-detail-history-tab'

interface PolicyDetailTabPlaceholderProps {
  icon: LucideIcon
  title: string
  description: string
}

function PolicyDetailTabPlaceholder({
  icon: Icon,
  title,
  description,
}: PolicyDetailTabPlaceholderProps) {
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

export interface PolicyDetailTabsProps {
  policyId: string
  policy?: GetPolicyByIdResponse
  isLoading: boolean
  isError: boolean
  onRetry: () => void | Promise<void>
}

export function PolicyDetailTabs({
  policyId,
  policy,
  isLoading,
  isError,
  onRetry,
}: PolicyDetailTabsProps) {
  return (
    <ViewTabs defaultValue="general">
      <div data-slot="policy-detail-tabs-list-shell" className="space-y-2">
        <p
          data-slot="policy-detail-tabs-scroll-hint"
          className="text-xs text-[var(--color-gray-500)] lg:hidden"
        >
          Desliza las pestañas para ver todas las secciones.
        </p>

        <div className="relative">
          <div
            data-slot="policy-detail-tabs-scroll-fade"
            className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-white to-transparent 2xl:hidden"
          />
          <ViewTabs.List>
            <ViewTabs.Trigger value="general">
              <ClipboardList className="hidden size-4 sm:inline" />
              General
            </ViewTabs.Trigger>
            <ViewTabs.Trigger value="documentos">
              <Paperclip className="hidden size-4 sm:inline" />
              Documentos
            </ViewTabs.Trigger>
            <ViewTabs.Trigger value="historial">
              <Clock className="hidden size-4 sm:inline" />
              Historial
            </ViewTabs.Trigger>
          </ViewTabs.List>
        </div>
      </div>

      <ViewTabs.Content value="general">
        <PolicyDetailMainTab
          policyId={policyId}
          policy={policy}
          isLoading={isLoading}
          isError={isError}
          onRetry={onRetry}
        />
      </ViewTabs.Content>

      <ViewTabs.Content value="documentos">
        <PolicyDetailTabPlaceholder
          icon={Paperclip}
          title="Documentos"
          description="Soportes, archivos cargados y estado de validación documental."
        />
      </ViewTabs.Content>

      <ViewTabs.Content value="historial">
        <PolicyDetailHistoryTab policyId={policyId} />
      </ViewTabs.Content>
    </ViewTabs>
  )
}
