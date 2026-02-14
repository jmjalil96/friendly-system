import { createFileRoute } from '@tanstack/react-router'
import { PoliciesListPage } from '@/features/policies/list/page/policies-list-page'
import { parsePoliciesListRouteSearch } from '@/features/policies/list/route-contract/policies-list.contract'
import type { PoliciesListSearchUpdater } from '@/features/policies/list/controller/use-policies-list-controller'

export const Route = createFileRoute('/_authenticated/polizas/')({
  validateSearch: parsePoliciesListRouteSearch,
  component: PolizasRoute,
})

function PolizasRoute() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()

  const updateSearch: PoliciesListSearchUpdater = (updater, options) => {
    void navigate({
      search: updater,
      replace: options?.replace ?? false,
    })
  }

  return (
    <PoliciesListPage
      search={search}
      updateSearch={updateSearch}
      onPolicyCreated={(id) =>
        void navigate({
          to: '/polizas/$id',
          params: { id },
        })
      }
    />
  )
}
