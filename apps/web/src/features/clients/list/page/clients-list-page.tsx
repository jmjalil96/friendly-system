import { ClientCreateDialog } from '@/features/clients/list/ui/client-create-dialog'
import { ClientsFilterBar } from '@/features/clients/list/ui/clients-filter-bar'
import { ClientsListHeader } from '@/features/clients/list/ui/clients-list-header'
import { ClientsListTable } from '@/features/clients/list/ui/clients-list-table'
import type { ClientsListSearch } from '@/features/clients/model/clients.search'
import {
  CLIENTS_PAGE_CONTAINER_CLASSNAME,
  CLIENTS_STICKY_CHROME_CLASSNAME,
} from '@/features/clients/model/clients.ui-tokens'
import {
  type ClientsListSearchUpdater,
  useClientsListController,
} from '@/features/clients/list/controller/use-clients-list-controller'

interface ClientsListPageProps {
  search: ClientsListSearch
  updateSearch: ClientsListSearchUpdater
  onClientCreated: (id: string) => void
}

export function ClientsListPage({
  search,
  updateSearch,
  onClientCreated,
}: ClientsListPageProps) {
  const view = useClientsListController({
    search,
    updateSearch,
    onClientCreated,
  })

  return (
    <>
      <div
        data-slot="clients-list-top-chrome"
        className={CLIENTS_STICKY_CHROME_CLASSNAME}
      >
        <ClientsListHeader {...view.headerProps} />
        <ClientsFilterBar {...view.filterBarProps} />
      </div>

      <div className={CLIENTS_PAGE_CONTAINER_CLASSNAME}>
        <ClientsListTable {...view.tableProps} />
      </div>

      <ClientCreateDialog {...view.createDialogProps} />
    </>
  )
}
