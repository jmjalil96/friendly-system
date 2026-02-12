import { Link, useRouterState } from '@tanstack/react-router'
import * as Collapsible from '@radix-ui/react-collapsible'
import {
  Home,
  ClipboardList,
  HelpCircle,
  ChevronDown,
  ChevronsUpDown,
  Settings,
  LogOut,
} from 'lucide-react'
import { useState } from 'react'
import { Logo } from '@/app/shell/logo'
import { useAuthUser, useLogout } from '@/features/auth/api/auth.hooks'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/ui/primitives/dropdown-menu'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarSeparator,
} from '@/shared/ui/composites/sidebar'

const navItems = [{ label: 'Inicio', icon: Home, href: '/' }] as const

const reclamosSubItems = [
  { label: 'Nuevo', href: '/reclamos/nuevo' },
  { label: 'Todos', href: '/reclamos' },
  { label: 'Pendientes', href: '/reclamos/pendientes' },
] as const

function getInitials(firstName: string | null, lastName: string | null) {
  const f = firstName?.charAt(0).toUpperCase() ?? ''
  const l = lastName?.charAt(0).toUpperCase() ?? ''
  return f + l || '?'
}

function getUserDisplayName(
  firstName: string | null,
  lastName: string | null,
  email: string,
) {
  if (firstName && lastName) return `${firstName} ${lastName}`
  if (firstName) return firstName
  return email
}

export function AppSidebar() {
  const { user } = useAuthUser()
  const { logout } = useLogout()
  const routerState = useRouterState()
  const currentPath = routerState.location.pathname
  const [reclamosOpen, setReclamosOpen] = useState(
    currentPath.startsWith('/reclamos'),
  )

  return (
    <Sidebar side="left" collapsible="icon">
      {/* Logo */}
      <SidebarHeader className="flex items-center justify-center px-[var(--space-md)] pt-[var(--space-lg)] pb-[var(--space-xl)]">
        <Logo variant="light" size="sm" />
      </SidebarHeader>
      <SidebarSeparator />

      {/* Navigation */}
      <SidebarContent className="pt-[var(--space-md)]">
        <SidebarGroup className="px-[var(--space-md)]">
          <SidebarGroupContent>
            <SidebarMenu className="gap-[var(--space-xs)]">
              {/* Inicio */}
              {navItems.map((item) => (
                <SidebarMenuItem key={item.label}>
                  <SidebarMenuButton
                    asChild
                    isActive={currentPath === item.href}
                    className="h-auto gap-[var(--space-md)] px-3 py-[0.625rem] text-[0.85rem] font-medium rounded-[var(--radius-md)] text-white [&>svg]:size-[18px] hover:bg-[rgba(255,255,255,0.08)] data-[active=true]:bg-[rgba(255,255,255,0.12)] data-[active=true]:hover:bg-[rgba(255,255,255,0.15)] data-[active=true]:text-white"
                    tooltip={item.label}
                  >
                    <Link to={item.href}>
                      <item.icon
                        size={18}
                        className={
                          currentPath === item.href
                            ? 'opacity-100'
                            : 'opacity-70'
                        }
                      />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}

              {/* Reclamos (collapsible) */}
              <Collapsible.Root
                open={reclamosOpen}
                onOpenChange={setReclamosOpen}
              >
                <SidebarMenuItem>
                  <Collapsible.Trigger asChild>
                    <SidebarMenuButton
                      className="h-auto gap-[var(--space-md)] px-3 py-[0.625rem] text-[0.85rem] font-medium rounded-[var(--radius-md)] text-white [&>svg]:size-[18px] hover:bg-[rgba(255,255,255,0.08)]"
                      tooltip="Reclamos"
                    >
                      <ClipboardList
                        size={18}
                        className={
                          currentPath.startsWith('/reclamos')
                            ? 'opacity-100'
                            : 'opacity-70'
                        }
                      />
                      <span>Reclamos</span>
                      <ChevronDown
                        size={14}
                        className={`ml-auto shrink-0 opacity-40 transition-transform duration-200 ${reclamosOpen ? 'rotate-180 opacity-60' : ''}`}
                      />
                    </SidebarMenuButton>
                  </Collapsible.Trigger>
                  <Collapsible.Content>
                    <SidebarMenuSub className="ml-0 border-l-0 pl-0">
                      {reclamosSubItems.map((sub) => {
                        const isSubActive = currentPath === sub.href
                        return (
                          <SidebarMenuSubItem key={sub.label}>
                            <SidebarMenuSubButton
                              asChild
                              isActive={isSubActive}
                              className={`h-auto py-[0.425rem] pl-[2.85rem] pr-3 text-[0.8rem] font-medium rounded-[var(--radius-md)] text-[rgba(255,255,255,0.6)] hover:text-white hover:bg-[rgba(255,255,255,0.06)] ${isSubActive ? 'text-white font-semibold relative before:content-[""] before:absolute before:left-[2rem] before:top-1/2 before:-translate-y-1/2 before:w-1 before:h-1 before:rounded-full before:bg-white' : ''}`}
                            >
                              <Link to={sub.href}>
                                <span>{sub.label}</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        )
                      })}
                    </SidebarMenuSub>
                  </Collapsible.Content>
                </SidebarMenuItem>
              </Collapsible.Root>

              {/* Soporte */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  className="h-auto gap-[var(--space-md)] px-3 py-[0.625rem] text-[0.85rem] font-medium rounded-[var(--radius-md)] text-white [&>svg]:size-[18px] hover:bg-[rgba(255,255,255,0.08)]"
                  tooltip="Soporte"
                >
                  <HelpCircle size={18} className="opacity-70" />
                  <span>Soporte</span>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Algo* AI */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  className="h-auto gap-[var(--space-md)] px-3 py-[0.625rem] text-[0.85rem] font-medium rounded-[var(--radius-md)] text-white hover:bg-[rgba(255,0,43,0.08)]"
                  tooltip="Algo*"
                >
                  <span className="shrink-0 rounded-[4px] bg-[var(--color-red-500)] px-[5px] py-[3px] text-[0.6rem] font-bold leading-none tracking-[0.03em] text-white">
                    AI
                  </span>
                  <span>Algo*</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* User Footer */}
      <SidebarFooter className="px-[var(--space-md)] pb-[var(--space-lg)]">
        <SidebarSeparator />
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  className="h-auto gap-[var(--space-md)] p-2 rounded-[var(--radius-md)] text-white hover:bg-[rgba(255,255,255,0.08)]"
                  tooltip={
                    user
                      ? getUserDisplayName(
                          user.firstName,
                          user.lastName,
                          user.email,
                        )
                      : 'User'
                  }
                >
                  {/* Avatar */}
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-red-500)] text-[0.7rem] font-semibold tracking-[0.02em] text-white">
                    {user ? getInitials(user.firstName, user.lastName) : '?'}
                  </span>
                  {/* Info */}
                  <span className="flex min-w-0 flex-1 flex-col overflow-hidden">
                    <span className="truncate text-[0.8rem] font-semibold leading-[1.3]">
                      {user
                        ? getUserDisplayName(
                            user.firstName,
                            user.lastName,
                            user.email,
                          )
                        : 'Loading...'}
                    </span>
                    <span className="truncate text-[0.7rem] leading-[1.3] text-[rgba(255,255,255,0.6)]">
                      {user?.orgSlug ?? ''}
                    </span>
                  </span>
                  {/* Chevron */}
                  <ChevronsUpDown
                    size={14}
                    className="shrink-0 text-[rgba(255,255,255,0.5)]"
                  />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="top"
                align="start"
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-[var(--radius-md)]"
              >
                <DropdownMenuLabel className="flex flex-col gap-0.5 px-3 py-2">
                  <span className="text-[0.8rem] font-semibold">
                    {user
                      ? getUserDisplayName(
                          user.firstName,
                          user.lastName,
                          user.email,
                        )
                      : 'User'}
                  </span>
                  <span className="text-[0.7rem] font-normal text-[var(--color-gray-500)]">
                    {user?.email ?? ''}
                  </span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="gap-2 px-3 py-2 text-[0.85rem]">
                  <Settings size={16} />
                  Configuración
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="gap-2 px-3 py-2 text-[0.85rem]"
                  onClick={() => void logout()}
                >
                  <LogOut size={16} />
                  Cerrar sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
