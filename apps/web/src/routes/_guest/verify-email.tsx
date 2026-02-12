import { createFileRoute } from '@tanstack/react-router'
import { VerifyEmailPage } from '@/features/auth/pages/verify-email-page'
import { parseVerifyEmailSearch } from '@/features/auth/route-contracts/verify-email.contract'

export const Route = createFileRoute('/_guest/verify-email')({
  validateSearch: parseVerifyEmailSearch,
  component: VerifyEmailRoute,
})

function VerifyEmailRoute() {
  const { token } = Route.useSearch()

  return <VerifyEmailPage token={token} />
}
