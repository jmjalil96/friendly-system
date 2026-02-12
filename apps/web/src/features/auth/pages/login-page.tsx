import { AuthLayout } from '@/features/auth/ui/auth-layout'
import { LoginForm } from '@/features/auth/ui/login-form'

export function LoginPage() {
  return (
    <AuthLayout>
      <LoginForm />
    </AuthLayout>
  )
}
