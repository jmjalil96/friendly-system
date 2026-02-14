import { PolicyCreateDialog } from '@/features/policies/list/ui/policy-create-dialog'
import { PoliciesFilterBar } from '@/features/policies/list/ui/policies-filter-bar'
import { PoliciesListHeader } from '@/features/policies/list/ui/policies-list-header'
import { PoliciesListTable } from '@/features/policies/list/ui/policies-list-table'
import type { PoliciesListSearch } from '@/features/policies/model/policies.search'
import {
  POLICIES_PAGE_CONTAINER_CLASSNAME,
  POLICIES_STICKY_CHROME_CLASSNAME,
} from '@/features/policies/model/policies.ui-tokens'
import {
  type PoliciesListSearchUpdater,
  usePoliciesListController,
} from '@/features/policies/list/controller/use-policies-list-controller'

interface PoliciesListPageProps {
  search: PoliciesListSearch
  updateSearch: PoliciesListSearchUpdater
  onPolicyCreated: (id: string) => void
}

export function PoliciesListPage({
  search,
  updateSearch,
  onPolicyCreated,
}: PoliciesListPageProps) {
  const view = usePoliciesListController({
    search,
    updateSearch,
    onPolicyCreated,
  })

  return (
    <>
      <div
        data-slot="policies-list-top-chrome"
        className={POLICIES_STICKY_CHROME_CLASSNAME}
      >
        <PoliciesListHeader {...view.headerProps} />
        <PoliciesFilterBar {...view.filterBarProps} />
      </div>

      <div className={POLICIES_PAGE_CONTAINER_CLASSNAME}>
        <PoliciesListTable {...view.tableProps} />
      </div>

      <PolicyCreateDialog {...view.createDialogProps} />
    </>
  )
}
