import { createFileRoute } from '@tanstack/react-router'
import { NewClaimPage } from '@/features/claims/create/page/new-claim-page'
import { DEFAULT_CLAIMS_LIST_SEARCH } from '@/features/claims/model/claims.search'

export const Route = createFileRoute('/_authenticated/reclamos/nuevo')({
  component: NuevoClaimRoute,
})

function NuevoClaimRoute() {
  const navigate = Route.useNavigate()

  return (
    <NewClaimPage
      onCancel={() =>
        void navigate({
          to: '/reclamos',
          search: DEFAULT_CLAIMS_LIST_SEARCH,
        })
      }
      onCreated={(id) =>
        void navigate({
          to: '/reclamos/$id',
          params: { id },
        })
      }
    />
  )
}
