import { ClaimDetailHeader } from '@/features/claims/detail/ui/claim-detail-header'
import { ClaimDetailTabs } from '@/features/claims/detail/ui/claim-detail-tabs'
import { useClaimDetailController } from '@/features/claims/detail/controller'
import { CLAIMS_PAGE_CONTAINER_CLASSNAME } from '@/features/claims/model/claims.ui-tokens'

interface ClaimDetailPageProps {
  claimId: string
  onBack: () => void
}

export function ClaimDetailPage({ claimId, onBack }: ClaimDetailPageProps) {
  const view = useClaimDetailController({ claimId, onBack })

  return (
    <>
      <ClaimDetailHeader {...view.headerProps} />
      <div className={CLAIMS_PAGE_CONTAINER_CLASSNAME}>
        <ClaimDetailTabs {...view.tabsProps} />
      </div>
    </>
  )
}
