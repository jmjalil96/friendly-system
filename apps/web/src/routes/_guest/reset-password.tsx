import { createFileRoute } from '@tanstack/react-router'
import { ResetPasswordPage } from '@/features/auth/pages/reset-password-page'
import { parseResetPasswordSearch } from '@/features/auth/route-contracts/reset-password.contract'

export const Route = createFileRoute('/_guest/reset-password')({
  validateSearch: parseResetPasswordSearch,
  component: ResetPasswordRoute,
})

function ResetPasswordRoute() {
  const { token } = Route.useSearch()

  return <ResetPasswordPage token={token} />
}
