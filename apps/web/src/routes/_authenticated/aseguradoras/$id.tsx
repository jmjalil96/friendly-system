import {
  Navigate,
  createFileRoute,
  type ErrorComponentProps,
} from '@tanstack/react-router'
import { ErrorFallback } from '@/app/shell/error-fallback'
import { InsurerDetailPage } from '@/features/insurers'
import { parseInsurerDetailParams } from '@/features/insurers/detail/route-contract/insurer-detail.contract'
import { DEFAULT_INSURERS_LIST_SEARCH } from '@/features/insurers/model/insurers.search'

export const Route = createFileRoute('/_authenticated/aseguradoras/$id')({
  params: {
    parse: parseInsurerDetailParams,
  },
  errorComponent: InsurerDetailRouteError,
  component: AseguradoraDetailRoute,
})

function InsurerDetailRouteError(props: ErrorComponentProps) {
  if (isInvalidInsurerIdError(props.error)) {
    return (
      <Navigate
        to="/aseguradoras"
        search={DEFAULT_INSURERS_LIST_SEARCH}
        replace
      />
    )
  }

  return <ErrorFallback {...props} />
}

function isInvalidInsurerIdError(error: unknown) {
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

function AseguradoraDetailRoute() {
  const { id } = Route.useParams()
  const navigate = Route.useNavigate()

  return (
    <InsurerDetailPage
      insurerId={id}
      onBack={() =>
        void navigate({
          to: '/aseguradoras',
          search: DEFAULT_INSURERS_LIST_SEARCH,
        })
      }
    />
  )
}
