import type { ClaimStatus } from '@friendly-system/shared'
import { ClaimsFilterBar } from '@/features/claims/list/ui/claims-filter-bar'
import { ClaimsListHeader } from '@/features/claims/list/ui/claims-list-header'
import { ClaimsListTable } from '@/features/claims/list/ui/claims-list-table'
import type { ClaimsListSearch } from '@/features/claims/model/claims.search'
import {
  CLAIMS_PAGE_CONTAINER_CLASSNAME,
  CLAIMS_STICKY_CHROME_CLASSNAME,
} from '@/features/claims/model/claims.ui-tokens'
import {
  type ClaimsListSearchUpdater,
  useClaimsListController,
} from '@/features/claims/list/controller/use-claims-list-controller'

interface ClaimsListPageProps {
  search: ClaimsListSearch
  updateSearch: ClaimsListSearchUpdater
  onCreateClaim: () => void
  lockedStatuses?: readonly ClaimStatus[]
  showStatusFilter?: boolean
  title?: string
  subtitle?: string
}

export function ClaimsListPage({
  search,
  updateSearch,
  onCreateClaim,
  lockedStatuses,
  showStatusFilter = true,
  title,
  subtitle,
}: ClaimsListPageProps) {
  const view = useClaimsListController({
    search,
    updateSearch,
    onCreateClaim,
    lockedStatuses,
    showStatusFilter,
  })

  return (
    <>
      <div
        data-slot="claims-list-top-chrome"
        className={CLAIMS_STICKY_CHROME_CLASSNAME}
      >
        <ClaimsListHeader
          {...view.headerProps}
          title={title}
          subtitle={subtitle}
        />
        <ClaimsFilterBar {...view.filterBarProps} />
      </div>
      <div className={CLAIMS_PAGE_CONTAINER_CLASSNAME}>
        <ClaimsListTable {...view.tableProps} />
      </div>
    </>
  )
}
