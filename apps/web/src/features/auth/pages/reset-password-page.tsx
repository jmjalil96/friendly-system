import { AuthLayout } from '@/features/auth/ui/auth-layout'
import { ResetPasswordForm } from '@/features/auth/ui/reset-password-form'

interface ResetPasswordPageProps {
  token: string
}

export function ResetPasswordPage({ token }: ResetPasswordPageProps) {
  return (
    <AuthLayout>
      <ResetPasswordForm token={token} />
    </AuthLayout>
  )
}
