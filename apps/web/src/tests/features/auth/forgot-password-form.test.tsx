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
import { ForgotPasswordForm } from '@/features/auth/components/forgot-password-form'

const forgotPasswordMock = vi.hoisted(() => vi.fn())

vi.mock('@/features/auth/api', () => ({
  authApi: {
    forgotPassword: forgotPasswordMock,
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

describe('ForgotPasswordForm', () => {
  afterEach(() => {
    cleanup()
  })

  beforeEach(() => {
    forgotPasswordMock.mockReset()
  })

  it('renders validation errors and does not call API on invalid submit', async () => {
    renderWithQueryClient(<ForgotPasswordForm />)

    fireEvent.click(screen.getByRole('button', { name: 'Enviar enlace' }))

    await waitFor(() => {
      expect(screen.getAllByRole('alert').length).toBeGreaterThan(0)
    })
    expect(forgotPasswordMock).not.toHaveBeenCalled()
  })

  it('submits normalized email and renders success state', async () => {
    forgotPasswordMock.mockResolvedValueOnce({
      message:
        'If that email is registered, a password reset link has been sent',
      email: 'user@example.com',
    })

    renderWithQueryClient(<ForgotPasswordForm />)

    fireEvent.change(screen.getByLabelText('Correo electrónico'), {
      target: { value: '  USER@EXAMPLE.COM ' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Enviar enlace' }))

    await screen.findByText('Revisa tu correo')
    expect(
      await screen.findByText(
        'If that email is registered, a password reset link has been sent',
      ),
    ).toBeDefined()
    expect(await screen.findByText('user@example.com')).toBeDefined()
    expect(forgotPasswordMock).toHaveBeenCalledTimes(1)
    expect(forgotPasswordMock.mock.calls[0]?.[0]).toEqual({
      email: 'user@example.com',
    })
  })

  it('disables submit button while request is pending', async () => {
    let resolveRequest!: (value: { message: string; email: string }) => void

    forgotPasswordMock.mockReturnValueOnce(
      new Promise<{ message: string; email: string }>((resolve) => {
        resolveRequest = resolve
      }),
    )

    renderWithQueryClient(<ForgotPasswordForm />)

    fireEvent.change(screen.getByLabelText('Correo electrónico'), {
      target: { value: 'user@example.com' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Enviar enlace' }))

    await waitFor(() => {
      const pendingButton = screen.getByRole('button', {
        name: 'Enviando enlace...',
      }) as HTMLButtonElement
      expect(pendingButton.disabled).toBe(true)
    })

    resolveRequest({
      message:
        'If that email is registered, a password reset link has been sent',
      email: 'user@example.com',
    })

    await screen.findByText('Revisa tu correo')
  })
})
