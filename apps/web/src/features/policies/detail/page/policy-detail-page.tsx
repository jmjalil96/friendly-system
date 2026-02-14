import { PolicyDetailHeader } from '@/features/policies/detail/ui/policy-detail-header'
import { PolicyDetailTabs } from '@/features/policies/detail/ui/policy-detail-tabs'
import { PolicyDeleteDialog } from '@/features/policies/detail/ui/policy-delete-dialog'
import { usePolicyDetailController } from '@/features/policies/detail/controller'
import { POLICIES_PAGE_CONTAINER_CLASSNAME } from '@/features/policies/model/policies.ui-tokens'

interface PolicyDetailPageProps {
  policyId: string
  onBack: () => void
}

export function PolicyDetailPage({ policyId, onBack }: PolicyDetailPageProps) {
  const view = usePolicyDetailController({ policyId, onBack })

  return (
    <>
      <PolicyDetailHeader {...view.headerProps} />
      <div className={POLICIES_PAGE_CONTAINER_CLASSNAME}>
        <PolicyDetailTabs {...view.tabsProps} />
      </div>
      <PolicyDeleteDialog {...view.deleteDialogProps} />
    </>
  )
}
