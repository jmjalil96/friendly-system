import { useInsurerDetailController } from '@/features/insurers/detail/controller'
import { InsurerDeactivateDialog } from '@/features/insurers/detail/ui/insurer-deactivate-dialog'
import { InsurerDetailHeader } from '@/features/insurers/detail/ui/insurer-detail-header'
import { InsurerDetailTabs } from '@/features/insurers/detail/ui/insurer-detail-tabs'
import { INSURERS_PAGE_CONTAINER_CLASSNAME } from '@/features/insurers/model/insurers.ui-tokens'

interface InsurerDetailPageProps {
  insurerId: string
  onBack: () => void
}

export function InsurerDetailPage({
  insurerId,
  onBack,
}: InsurerDetailPageProps) {
  const view = useInsurerDetailController({ insurerId, onBack })

  return (
    <>
      <InsurerDetailHeader {...view.headerProps} />
      <div className={INSURERS_PAGE_CONTAINER_CLASSNAME}>
        <InsurerDetailTabs {...view.tabsProps} />
      </div>
      <InsurerDeactivateDialog {...view.deactivateDialogProps} />
    </>
  )
}
