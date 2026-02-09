import { createFileRoute } from '@tanstack/react-router'
import { AuthLayout } from '../../features/auth/components/auth-layout'
import { RegisterForm } from '../../features/auth/components/register-form'

export const Route = createFileRoute('/_guest/register')({
  component: RegisterPage,
})

function RegisterPage() {
  return (
    <AuthLayout>
      <RegisterForm />
    </AuthLayout>
  )
}
