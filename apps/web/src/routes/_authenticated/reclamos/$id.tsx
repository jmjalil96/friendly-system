import {
  Navigate,
  createFileRoute,
  type ErrorComponentProps,
} from '@tanstack/react-router'
import { ErrorFallback } from '@/app/shell/error-fallback'
import { ClaimDetailPage } from '@/features/claims'
import { DEFAULT_CLAIMS_LIST_SEARCH } from '@/features/claims/model/claims.search'
import { parseClaimDetailParams } from '@/features/claims/detail/route-contract/claim-detail.contract'

export const Route = createFileRoute('/_authenticated/reclamos/$id')({
  params: {
    parse: parseClaimDetailParams,
  },
  errorComponent: ClaimDetailRouteError,
  component: ReclamoDetailRoute,
})

function ClaimDetailRouteError(props: ErrorComponentProps) {
  if (isInvalidClaimIdError(props.error)) {
    return (
      <Navigate to="/reclamos" search={DEFAULT_CLAIMS_LIST_SEARCH} replace />
    )
  }

  return <ErrorFallback {...props} />
}

function isInvalidClaimIdError(error: unknown) {
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

function ReclamoDetailRoute() {
  const { id } = Route.useParams()
  const navigate = Route.useNavigate()

  return (
    <ClaimDetailPage
      claimId={id}
      onBack={() =>
        void navigate({
          to: '/reclamos',
          search: DEFAULT_CLAIMS_LIST_SEARCH,
        })
      }
    />
  )
}
