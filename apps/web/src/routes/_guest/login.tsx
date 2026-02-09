import { createFileRoute } from '@tanstack/react-router'
import { AuthLayout } from '../../features/auth/components/auth-layout'
import { LoginForm } from '../../features/auth/components/login-form'

export const Route = createFileRoute('/_guest/login')({
  component: LoginPage,
})

function LoginPage() {
  return (
    <AuthLayout>
      <LoginForm />
    </AuthLayout>
  )
}
