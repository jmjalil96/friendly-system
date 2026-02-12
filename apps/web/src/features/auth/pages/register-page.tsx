import { AuthLayout } from '@/features/auth/ui/auth-layout'
import { RegisterForm } from '@/features/auth/ui/register-form'

export function RegisterPage() {
  return (
    <AuthLayout>
      <RegisterForm />
    </AuthLayout>
  )
}
