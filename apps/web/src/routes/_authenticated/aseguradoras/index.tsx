import { createFileRoute } from '@tanstack/react-router'
import { InsurersListPage } from '@/features/insurers/list/page/insurers-list-page'
import { parseInsurersListRouteSearch } from '@/features/insurers/list/route-contract/insurers-list.contract'
import type { InsurersListSearchUpdater } from '@/features/insurers/list/controller/use-insurers-list-controller'

export const Route = createFileRoute('/_authenticated/aseguradoras/')({
  validateSearch: parseInsurersListRouteSearch,
  component: AseguradorasRoute,
})

function AseguradorasRoute() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()

  const updateSearch: InsurersListSearchUpdater = (updater, options) => {
    void navigate({
      search: updater,
      replace: options?.replace ?? false,
    })
  }

  return (
    <InsurersListPage
      search={search}
      updateSearch={updateSearch}
      onInsurerCreated={(id) =>
        void navigate({
          to: '/aseguradoras/$id',
          params: { id },
        })
      }
    />
  )
}
