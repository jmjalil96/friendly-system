import { createFileRoute } from '@tanstack/react-router'
import { ClientsListPage } from '@/features/clients/list/page/clients-list-page'
import { parseClientsListRouteSearch } from '@/features/clients/list/route-contract/clients-list.contract'
import type { ClientsListSearchUpdater } from '@/features/clients/list/controller/use-clients-list-controller'

export const Route = createFileRoute('/_authenticated/clientes/')({
  validateSearch: parseClientsListRouteSearch,
  component: ClientesRoute,
})

function ClientesRoute() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()

  const updateSearch: ClientsListSearchUpdater = (updater, options) => {
    void navigate({
      search: updater,
      replace: options?.replace ?? false,
    })
  }

  return (
    <ClientsListPage
      search={search}
      updateSearch={updateSearch}
      onClientCreated={(id) =>
        void navigate({
          to: '/clientes/$id',
          params: { id },
        })
      }
    />
  )
}
