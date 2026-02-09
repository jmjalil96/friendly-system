import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { fetchFreshAuthUser } from '../features/auth/hooks/use-auth'
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/app-sidebar'
import { Logo } from '@/components/layout/logo'

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: async ({ context }) => {
    const user = await fetchFreshAuthUser(context.queryClient)

    if (!user) {
      throw redirect({ to: '/login', replace: true })
    }
  },
  component: AuthenticatedLayout,
})

function AuthenticatedLayout() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex items-center gap-[var(--space-sm)] border-b border-[var(--color-gray-200)] bg-white px-[var(--space-md)] py-[var(--space-sm)] md:hidden">
          <SidebarTrigger />
          <Logo variant="dark" size="sm" />
        </header>
        <div className="min-h-screen bg-[var(--color-gray-50)]">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
