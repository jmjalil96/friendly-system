import { createFileRoute } from '@tanstack/react-router'
import { ClaimsListPage } from '@/features/claims/list/page/claims-list-page'
import { NON_TERMINAL_CLAIM_STATUSES } from '@/features/claims/model/claims.status'
import {
  parsePendingClaimsListRouteSearch,
  stripStatus,
} from '@/features/claims/list/route-contract/claims-list.contract'
import type { ClaimsListSearchUpdater } from '@/features/claims/list/controller/use-claims-list-controller'
import type { ClaimsListSearch } from '@/features/claims/model/claims.search'

export const Route = createFileRoute('/_authenticated/reclamos/pendientes')({
  validateSearch: parsePendingClaimsListRouteSearch,
  component: PendientesRoute,
})

function PendientesRoute() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()

  const updateSearch: ClaimsListSearchUpdater = (updater, options) => {
    void navigate({
      search: (previous: ClaimsListSearch) =>
        stripStatus(updater(stripStatus(previous))),
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
      lockedStatuses={NON_TERMINAL_CLAIM_STATUSES}
      showStatusFilter={false}
      title="Reclamos pendientes"
      subtitle="Reclamos en gestión que aún no están en estado terminal"
    />
  )
}
