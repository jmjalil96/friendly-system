import {
  Navigate,
  createFileRoute,
  type ErrorComponentProps,
} from '@tanstack/react-router'
import { ErrorFallback } from '@/app/shell/error-fallback'
import { PolicyDetailPage } from '@/features/policies'
import { parsePolicyDetailParams } from '@/features/policies/detail/route-contract/policy-detail.contract'
import { DEFAULT_POLICIES_LIST_SEARCH } from '@/features/policies/model/policies.search'

export const Route = createFileRoute('/_authenticated/polizas/$id')({
  params: {
    parse: parsePolicyDetailParams,
  },
  errorComponent: PolicyDetailRouteError,
  component: PolizaDetailRoute,
})

function PolicyDetailRouteError(props: ErrorComponentProps) {
  if (isInvalidPolicyIdError(props.error)) {
    return (
      <Navigate to="/polizas" search={DEFAULT_POLICIES_LIST_SEARCH} replace />
    )
  }

  return <ErrorFallback {...props} />
}

function isInvalidPolicyIdError(error: unknown) {
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

function PolizaDetailRoute() {
  const { id } = Route.useParams()
  const navigate = Route.useNavigate()

  return (
    <PolicyDetailPage
      policyId={id}
      onBack={() =>
        void navigate({
          to: '/polizas',
          search: DEFAULT_POLICIES_LIST_SEARCH,
        })
      }
    />
  )
}
