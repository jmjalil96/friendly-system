import { useClientDetailController } from '@/features/clients/detail/controller'
import { ClientDeactivateDialog } from '@/features/clients/detail/ui/client-deactivate-dialog'
import { ClientDetailHeader } from '@/features/clients/detail/ui/client-detail-header'
import { ClientDetailTabs } from '@/features/clients/detail/ui/client-detail-tabs'
import { CLIENTS_PAGE_CONTAINER_CLASSNAME } from '@/features/clients/model/clients.ui-tokens'

interface ClientDetailPageProps {
  clientId: string
  onBack: () => void
}

export function ClientDetailPage({ clientId, onBack }: ClientDetailPageProps) {
  const view = useClientDetailController({ clientId, onBack })

  return (
    <>
      <ClientDetailHeader {...view.headerProps} />
      <div className={CLIENTS_PAGE_CONTAINER_CLASSNAME}>
        <ClientDetailTabs {...view.tabsProps} />
      </div>
      <ClientDeactivateDialog {...view.deactivateDialogProps} />
    </>
  )
}
