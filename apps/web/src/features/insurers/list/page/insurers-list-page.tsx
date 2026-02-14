import { InsurerCreateDialog } from '@/features/insurers/list/ui/insurer-create-dialog'
import { InsurersFilterBar } from '@/features/insurers/list/ui/insurers-filter-bar'
import { InsurersListHeader } from '@/features/insurers/list/ui/insurers-list-header'
import { InsurersListTable } from '@/features/insurers/list/ui/insurers-list-table'
import type { InsurersListSearch } from '@/features/insurers/model/insurers.search'
import {
  INSURERS_PAGE_CONTAINER_CLASSNAME,
  INSURERS_STICKY_CHROME_CLASSNAME,
} from '@/features/insurers/model/insurers.ui-tokens'
import {
  type InsurersListSearchUpdater,
  useInsurersListController,
} from '@/features/insurers/list/controller/use-insurers-list-controller'

interface InsurersListPageProps {
  search: InsurersListSearch
  updateSearch: InsurersListSearchUpdater
  onInsurerCreated: (id: string) => void
}

export function InsurersListPage({
  search,
  updateSearch,
  onInsurerCreated,
}: InsurersListPageProps) {
  const view = useInsurersListController({
    search,
    updateSearch,
    onInsurerCreated,
  })

  return (
    <>
      <div
        data-slot="insurers-list-top-chrome"
        className={INSURERS_STICKY_CHROME_CLASSNAME}
      >
        <InsurersListHeader {...view.headerProps} />
        <InsurersFilterBar {...view.filterBarProps} />
      </div>

      <div className={INSURERS_PAGE_CONTAINER_CLASSNAME}>
        <InsurersListTable {...view.tableProps} />
      </div>

      <InsurerCreateDialog {...view.createDialogProps} />
    </>
  )
}
