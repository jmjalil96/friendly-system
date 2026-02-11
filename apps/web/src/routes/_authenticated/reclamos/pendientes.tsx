import { useCallback } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import {
  NON_TERMINAL_CLAIM_STATUSES,
} from '@/features/claims/components/list/claim-status'
import { ClaimsFilterBar } from '@/features/claims/components/list/claims-filter-bar'
import { ClaimsListHeader } from '@/features/claims/components/list/claims-list-header'
import { ClaimsListTable } from '@/features/claims/components/list/claims-list-table'
import {
  parseClaimsListSearch,
  type ClaimsListSearch,
} from '@/features/claims/claims-list-search'
import {
  type ClaimsListSearchUpdater,
  useClaimsListView,
} from '@/features/claims/hooks/use-claims-list-view'

function stripStatus(search: ClaimsListSearch): ClaimsListSearch {
  const nextSearch = { ...search }
  delete nextSearch.status
  return nextSearch
}

export const Route = createFileRoute('/_authenticated/reclamos/pendientes')({
  validateSearch: (search: Record<string, unknown>) =>
    stripStatus(parseClaimsListSearch(search)),
  component: PendientesPage,
})

function PendientesPage() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()

  const updateSearch = useCallback<ClaimsListSearchUpdater>(
    (updater, options) => {
      void navigate({
        search: (previous: ClaimsListSearch) =>
          stripStatus(updater(stripStatus(previous))),
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
    lockedStatuses: NON_TERMINAL_CLAIM_STATUSES,
    showStatusFilter: false,
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
          title="Reclamos pendientes"
          subtitle="Reclamos en gesti&oacute;n que a&uacute;n no est&aacute;n en estado terminal"
        />
        <ClaimsFilterBar {...view.filterBarProps} />
      </div>
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 xl:px-8">
        <ClaimsListTable {...view.tableProps} />
      </div>
    </>
  )
}
