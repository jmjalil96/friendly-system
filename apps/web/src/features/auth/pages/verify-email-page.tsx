import { AuthLayout } from '@/features/auth/ui/auth-layout'
import { VerifyEmail } from '@/features/auth/ui/verify-email'

interface VerifyEmailPageProps {
  token: string
}

export function VerifyEmailPage({ token }: VerifyEmailPageProps) {
  return (
    <AuthLayout>
      <VerifyEmail token={token} />
    </AuthLayout>
  )
}
