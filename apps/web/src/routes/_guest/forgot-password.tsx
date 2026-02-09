import { createFileRoute } from '@tanstack/react-router'
import { AuthLayout } from '../../features/auth/components/auth-layout'
import { ForgotPasswordForm } from '../../features/auth/components/forgot-password-form'

export const Route = createFileRoute('/_guest/forgot-password')({
  component: ForgotPasswordPage,
})

function ForgotPasswordPage() {
  return (
    <AuthLayout>
      <ForgotPasswordForm />
    </AuthLayout>
  )
}
