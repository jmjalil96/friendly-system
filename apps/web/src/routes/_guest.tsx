import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { ensureAuthUser } from '../features/auth/hooks/use-auth'

export const Route = createFileRoute('/_guest')({
  beforeLoad: async ({ context }) => {
    const user = await ensureAuthUser(context.queryClient)

    if (user) {
      throw redirect({ to: '/', replace: true })
    }
  },
  component: Outlet,
})
