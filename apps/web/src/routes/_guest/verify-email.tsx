import { createFileRoute } from '@tanstack/react-router'
import { AuthLayout } from '../../features/auth/components/auth-layout'
import { VerifyEmail } from '../../features/auth/components/verify-email'

export const Route = createFileRoute('/_guest/verify-email')({
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search.token === 'string' ? search.token : '',
  }),
  component: VerifyEmailPage,
})

function VerifyEmailPage() {
  const { token } = Route.useSearch()

  return (
    <AuthLayout>
      <VerifyEmail token={token} />
    </AuthLayout>
  )
}
