import {
  Navigate,
  createFileRoute,
  type ErrorComponentProps,
} from '@tanstack/react-router'
import { ErrorFallback } from '@/app/shell/error-fallback'
import { ClientDetailPage } from '@/features/clients'
import { parseClientDetailParams } from '@/features/clients/detail/route-contract/client-detail.contract'
import { DEFAULT_CLIENTS_LIST_SEARCH } from '@/features/clients/model/clients.search'

export const Route = createFileRoute('/_authenticated/clientes/$id')({
  params: {
    parse: parseClientDetailParams,
  },
  errorComponent: ClientDetailRouteError,
  component: ClienteDetailRoute,
})

function ClientDetailRouteError(props: ErrorComponentProps) {
  if (isInvalidClientIdError(props.error)) {
    return (
      <Navigate to="/clientes" search={DEFAULT_CLIENTS_LIST_SEARCH} replace />
    )
  }

  return <ErrorFallback {...props} />
}

function isInvalidClientIdError(error: unknown) {
  if (!isValidationError(error)) {
    return false
  }

  return error.issues.some(
    (issue) =>
      Array.isArray(issue.path) &&
      issue.path.some((segment) => segment === 'id'),
  )
}

function isValidationError(
  error: unknown,
): error is { issues: Array<{ path?: unknown[] }> } {
  if (typeof error !== 'object' || error === null) {
    return false
  }

  return Array.isArray((error as { issues?: unknown }).issues)
}

function ClienteDetailRoute() {
  const { id } = Route.useParams()
  const navigate = Route.useNavigate()

  return (
    <ClientDetailPage
      clientId={id}
      onBack={() =>
        void navigate({
          to: '/clientes',
          search: DEFAULT_CLIENTS_LIST_SEARCH,
        })
      }
    />
  )
}
