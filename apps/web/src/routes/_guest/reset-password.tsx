import { createFileRoute } from '@tanstack/react-router'
import { AuthLayout } from '../../features/auth/components/auth-layout'
import { ResetPasswordForm } from '../../features/auth/components/reset-password-form'

export const Route = createFileRoute('/_guest/reset-password')({
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search.token === 'string' ? search.token : '',
  }),
  component: ResetPasswordPage,
})

function ResetPasswordPage() {
  const { token } = Route.useSearch()

  return (
    <AuthLayout>
      <ResetPasswordForm token={token} />
    </AuthLayout>
  )
}
