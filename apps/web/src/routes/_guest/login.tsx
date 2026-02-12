import { createFileRoute } from '@tanstack/react-router'
import { LoginPage } from '@/features/auth/pages/login-page'

export const Route = createFileRoute('/_guest/login')({
  component: LoginPage,
})
