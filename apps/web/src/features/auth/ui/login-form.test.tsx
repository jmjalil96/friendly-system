// @vitest-environment jsdom
import { type ReactElement, type ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { LoginForm } from '@/features/auth/ui/login-form'

const loginMock = vi.hoisted(() => vi.fn())
const routerInvalidateMock = vi.hoisted(() => vi.fn())
const routerNavigateMock = vi.hoisted(() => vi.fn())

vi.mock('@/features/auth/api/auth.api', () => ({
  authApi: {
    login: loginMock,
  },
}))

vi.mock('@tanstack/react-router', async () => {
  const actual = await vi.importActual<typeof import('@tanstack/react-router')>(
    '@tanstack/react-router',
  )

  return {
    ...actual,
    Link: ({
      to,
      children,
      replace: _replace,
      ...props
    }: {
      to: string
      children: ReactNode
      replace?: boolean
    } & Record<string, unknown>) => (
      <a href={to} {...props}>
        {children}
      </a>
    ),
    useRouter: () => ({
      invalidate: routerInvalidateMock,
      navigate: routerNavigateMock,
    }),
  }
})

function renderWithQueryClient(ui: ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  )
}

function fillLoginForm(values?: { email?: string; password?: string }) {
  fireEvent.change(screen.getByLabelText('Correo electrónico'), {
    target: { value: values?.email ?? 'user@example.com' },
  })
  fireEvent.change(screen.getByLabelText('Contraseña'), {
    target: { value: values?.password ?? 'password123' },
  })
}

describe('LoginForm', () => {
  afterEach(() => {
    cleanup()
  })

  beforeEach(() => {
    loginMock.mockReset()
    routerInvalidateMock.mockReset()
    routerNavigateMock.mockReset()
    routerInvalidateMock.mockResolvedValue(undefined)
    routerNavigateMock.mockResolvedValue(undefined)
  })

  it('renders validation errors and does not submit invalid form', async () => {
    renderWithQueryClient(<LoginForm />)

    fireEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }))

    await waitFor(() => {
      expect(screen.getAllByRole('alert').length).toBeGreaterThan(0)
    })
    expect(loginMock).not.toHaveBeenCalled()
    expect(routerInvalidateMock).not.toHaveBeenCalled()
    expect(routerNavigateMock).not.toHaveBeenCalled()
  })

  it('submits normalized payload and redirects to home', async () => {
    loginMock.mockResolvedValueOnce({
      userId: '8ce4dbf3-f8f8-4f41-b6e4-a8fdd8cb56a8',
      email: 'user@example.com',
      firstName: 'Juan',
      lastName: 'Perez',
      orgSlug: 'org-slug',
      role: 'ADMIN',
    })

    renderWithQueryClient(<LoginForm />)
    fillLoginForm({
      email: '  USER@EXAMPLE.COM ',
      password: 'password123',
    })

    fireEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }))

    await waitFor(() => {
      expect(loginMock).toHaveBeenCalledTimes(1)
    })
    expect(loginMock.mock.calls[0]?.[0]).toEqual({
      email: 'user@example.com',
      password: 'password123',
    })

    await waitFor(() => {
      expect(routerInvalidateMock).toHaveBeenCalledTimes(1)
      expect(routerNavigateMock).toHaveBeenCalledWith({
        to: '/',
        replace: true,
      })
    })

    expect(routerInvalidateMock.mock.invocationCallOrder[0]).toBeLessThan(
      routerNavigateMock.mock.invocationCallOrder[0],
    )
  })

  it('disables submit while login mutation is pending', async () => {
    let resolveLogin!: (value: unknown) => void

    loginMock.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveLogin = resolve
      }),
    )

    renderWithQueryClient(<LoginForm />)
    fillLoginForm()

    fireEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }))

    await waitFor(() => {
      const pendingButton = screen.getByRole('button', {
        name: 'Iniciando sesión...',
      }) as HTMLButtonElement
      expect(pendingButton.disabled).toBe(true)
    })

    resolveLogin({
      userId: '8ce4dbf3-f8f8-4f41-b6e4-a8fdd8cb56a8',
      email: 'user@example.com',
      firstName: 'Juan',
      lastName: 'Perez',
      orgSlug: 'org-slug',
      role: 'ADMIN',
    })

    await waitFor(() => {
      expect(routerNavigateMock).toHaveBeenCalledTimes(1)
    })
  })

  it('does not navigate when login request fails', async () => {
    loginMock.mockRejectedValueOnce(new Error('Invalid credentials'))

    renderWithQueryClient(<LoginForm />)
    fillLoginForm()

    fireEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }))

    await waitFor(() => {
      expect(loginMock).toHaveBeenCalledTimes(1)
    })
    expect(routerInvalidateMock).not.toHaveBeenCalled()
    expect(routerNavigateMock).not.toHaveBeenCalled()
  })
})
