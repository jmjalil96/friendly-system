import { createFileRoute } from '@tanstack/react-router'
import { ClaimsListPage } from '@/features/claims/list/page/claims-list-page'
import { parseClaimsListRouteSearch } from '@/features/claims/list/route-contract/claims-list.contract'
import type { ClaimsListSearchUpdater } from '@/features/claims/list/controller/use-claims-list-controller'

export const Route = createFileRoute('/_authenticated/reclamos/')({
  validateSearch: parseClaimsListRouteSearch,
  component: ReclamosRoute,
})

function ReclamosRoute() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()

  const updateSearch: ClaimsListSearchUpdater = (updater, options) => {
    void navigate({
      search: updater,
      replace: options?.replace ?? false,
    })
  }

  return (
    <ClaimsListPage
      search={search}
      updateSearch={updateSearch}
      onCreateClaim={() => {
        void navigate({ to: '/reclamos/nuevo' })
      }}
    />
  )
}
