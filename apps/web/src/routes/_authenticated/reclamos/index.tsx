import { useCallback } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { ClaimsFilterBar } from '@/features/claims/components/list/claims-filter-bar'
import { ClaimsListHeader } from '@/features/claims/components/list/claims-list-header'
import { ClaimsListTable } from '@/features/claims/components/list/claims-list-table'
import {
  parseClaimsListSearch,
} from '@/features/claims/claims-list-search'
import {
  type ClaimsListSearchUpdater,
  useClaimsListView,
} from '@/features/claims/hooks/use-claims-list-view'

export const Route = createFileRoute('/_authenticated/reclamos/')({
  validateSearch: (search: Record<string, unknown>) =>
    parseClaimsListSearch(search),
  component: ReclamosPage,
})

function ReclamosPage() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()

  const updateSearch = useCallback<ClaimsListSearchUpdater>(
    (updater, options) => {
      void navigate({
        search: updater,
        replace: options?.replace ?? false,
      })
    },
    [navigate],
  )

  const view = useClaimsListView({
    search,
    updateSearch,
    onCreateClaim: () => {
      void navigate({ to: '/reclamos/nuevo' })
    },
  })

  return (
    <>
      <div
        data-slot="claims-list-top-chrome"
        className="bg-white xl:sticky xl:top-0 xl:z-20"
      >
        <ClaimsListHeader
          {...view.headerProps}
          className="static z-auto shadow-none"
        />
        <ClaimsFilterBar {...view.filterBarProps} />
      </div>
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 xl:px-8">
        <ClaimsListTable {...view.tableProps} />
      </div>
    </>
  )
}
