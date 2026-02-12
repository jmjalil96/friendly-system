import { AuthLayout } from '@/features/auth/ui/auth-layout'
import { ForgotPasswordForm } from '@/features/auth/ui/forgot-password-form'

export function ForgotPasswordPage() {
  return (
    <AuthLayout>
      <ForgotPasswordForm />
    </AuthLayout>
  )
}
