import type { LucideIcon } from 'lucide-react'
import { ClipboardList, Clock, FileText, Paperclip } from 'lucide-react'
import type { GetClaimByIdResponse } from '@friendly-system/shared'
import { ViewTabs } from '@/shared/ui/composites/view-tabs'
import { ClaimDetailMainTab } from './claim-detail-main-tab'
import { ClaimDetailHistoryTab } from './history/claim-detail-history-tab'
import { ClaimDetailInvoicesTab } from './invoices/claim-detail-invoices-tab'

interface ClaimDetailTabPlaceholderProps {
  icon: LucideIcon
  title: string
  description: string
}

function ClaimDetailTabPlaceholder({
  icon: Icon,
  title,
  description,
}: ClaimDetailTabPlaceholderProps) {
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

export interface ClaimDetailTabsProps {
  claimId: string
  claim?: GetClaimByIdResponse
  isLoading: boolean
  isError: boolean
  onRetry: () => void | Promise<void>
}

export function ClaimDetailTabs({
  claimId,
  claim,
  isLoading,
  isError,
  onRetry,
}: ClaimDetailTabsProps) {
  return (
    <ViewTabs defaultValue="general">
      <div data-slot="claim-detail-tabs-list-shell" className="space-y-2">
        <p
          data-slot="claim-detail-tabs-scroll-hint"
          className="text-xs text-[var(--color-gray-500)] lg:hidden"
        >
          Desliza las pestañas para ver todas las secciones.
        </p>

        <div className="relative">
          <div
            data-slot="claim-detail-tabs-scroll-fade"
            className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-white to-transparent 2xl:hidden"
          />
          <ViewTabs.List>
            <ViewTabs.Trigger value="general">
              <ClipboardList className="hidden size-4 sm:inline" />
              General
            </ViewTabs.Trigger>
            <ViewTabs.Trigger value="facturas">
              <FileText className="hidden size-4 sm:inline" />
              Facturas
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
        <ClaimDetailMainTab
          claimId={claimId}
          claim={claim}
          isLoading={isLoading}
          isError={isError}
          onRetry={onRetry}
        />
      </ViewTabs.Content>

      <ViewTabs.Content value="facturas">
        <ClaimDetailInvoicesTab claimId={claimId} />
      </ViewTabs.Content>

      <ViewTabs.Content value="documentos">
        <ClaimDetailTabPlaceholder
          icon={Paperclip}
          title="Documentos"
          description="Soportes, archivos cargados y estado de validación documental."
        />
      </ViewTabs.Content>

      <ViewTabs.Content value="historial">
        <ClaimDetailHistoryTab claimId={claimId} />
      </ViewTabs.Content>
    </ViewTabs>
  )
}
