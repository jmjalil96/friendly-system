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
import { RegisterForm } from '@/features/auth/components/register-form'

const registerMock = vi.hoisted(() => vi.fn())

vi.mock('@/features/auth/api', () => ({
  authApi: {
    register: registerMock,
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

function fillRegisterForm() {
  fireEvent.change(screen.getByLabelText('Nombre'), {
    target: { value: 'Juan' },
  })
  fireEvent.change(screen.getByLabelText('Apellido'), {
    target: { value: 'Pérez' },
  })
  fireEvent.change(screen.getByLabelText('Correo electrónico'), {
    target: { value: 'juan@example.com' },
  })
  fireEvent.change(screen.getByLabelText('Contraseña'), {
    target: { value: 'password123' },
  })
  fireEvent.change(screen.getByLabelText('Nombre de la empresa'), {
    target: { value: 'Mi Empresa S.A.' },
  })
}

describe('RegisterForm', () => {
  afterEach(() => {
    cleanup()
  })

  beforeEach(() => {
    registerMock.mockReset()
  })

  it('renders client-side validation errors for invalid submit', async () => {
    renderWithQueryClient(<RegisterForm />)

    fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }))

    await waitFor(() => {
      expect(screen.getAllByRole('alert').length).toBeGreaterThan(0)
    })
    expect(registerMock).not.toHaveBeenCalled()
  })

  it('submits successfully and shows verification success content', async () => {
    registerMock.mockResolvedValueOnce({
      message: 'Te enviamos un enlace de verificación.',
      email: 'juan@example.com',
    })

    renderWithQueryClient(<RegisterForm />)
    fillRegisterForm()

    fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }))

    await screen.findByText('Revisa tu correo')
    expect(
      await screen.findByText('Te enviamos un enlace de verificación.'),
    ).toBeDefined()
    expect(await screen.findByText('juan@example.com')).toBeDefined()
    expect(registerMock).toHaveBeenCalledTimes(1)
    expect(registerMock.mock.calls[0]?.[0]).toEqual({
      firstName: 'Juan',
      lastName: 'Pérez',
      email: 'juan@example.com',
      password: 'password123',
      orgName: 'Mi Empresa S.A.',
    })
  })

  it('disables submit while register mutation is pending', async () => {
    let resolveRegister!: (value: { message: string; email: string }) => void

    registerMock.mockReturnValueOnce(
      new Promise<{ message: string; email: string }>((resolve) => {
        resolveRegister = resolve
      }),
    )

    renderWithQueryClient(<RegisterForm />)
    fillRegisterForm()

    fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }))

    await waitFor(() => {
      const pendingButton = screen.getByRole('button', {
        name: 'Creando cuenta...',
      }) as HTMLButtonElement
      expect(pendingButton.disabled).toBe(true)
    })

    resolveRegister({
      message: 'Te enviamos un enlace de verificación.',
      email: 'juan@example.com',
    })

    await screen.findByText('Revisa tu correo')
  })
})
