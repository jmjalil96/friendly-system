import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { fetchFreshAuthUser } from '../features/auth/hooks/use-auth'

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: async ({ context }) => {
    const user = await fetchFreshAuthUser(context.queryClient)

    if (!user) {
      throw redirect({ to: '/login', replace: true })
    }
  },
  component: Outlet,
})
