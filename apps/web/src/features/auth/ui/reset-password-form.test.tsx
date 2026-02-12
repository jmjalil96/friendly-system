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
import { ResetPasswordForm } from '@/features/auth/ui/reset-password-form'

const resetPasswordMock = vi.hoisted(() => vi.fn())

vi.mock('@/features/auth/api/auth.api', () => ({
  authApi: {
    resetPassword: resetPasswordMock,
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

describe('ResetPasswordForm', () => {
  afterEach(() => {
    cleanup()
  })

  beforeEach(() => {
    resetPasswordMock.mockReset()
  })

  it('shows missing-token state and does not call API', () => {
    renderWithQueryClient(<ResetPasswordForm token="" />)

    expect(screen.getByText('Enlace inválido')).toBeDefined()
    expect(
      screen.getByText('No se proporcionó un token de restablecimiento.'),
    ).toBeDefined()
    expect(resetPasswordMock).not.toHaveBeenCalled()
  })

  it('blocks submit with client-side validation error for invalid password', async () => {
    renderWithQueryClient(<ResetPasswordForm token="token-123" />)

    fireEvent.click(
      screen.getByRole('button', { name: 'Actualizar contraseña' }),
    )

    await waitFor(() => {
      expect(screen.getAllByRole('alert').length).toBeGreaterThan(0)
    })
    expect(resetPasswordMock).not.toHaveBeenCalled()
  })

  it('submits valid payload and renders success state', async () => {
    resetPasswordMock.mockResolvedValueOnce({ message: 'Password reset' })

    renderWithQueryClient(<ResetPasswordForm token="token-123" />)

    fireEvent.change(screen.getByLabelText('Nueva contraseña'), {
      target: { value: 'BrandNewPass123!' },
    })
    fireEvent.click(
      screen.getByRole('button', { name: 'Actualizar contraseña' }),
    )

    await screen.findByText('Contraseña actualizada')
    expect(await screen.findByText('Password reset')).toBeDefined()
    expect(resetPasswordMock).toHaveBeenCalledTimes(1)
    expect(resetPasswordMock.mock.calls[0]?.[0]).toEqual({
      token: 'token-123',
      newPassword: 'BrandNewPass123!',
    })
  })

  it('disables submit while reset request is pending', async () => {
    let resolveRequest!: (value: { message: string }) => void

    resetPasswordMock.mockReturnValueOnce(
      new Promise<{ message: string }>((resolve) => {
        resolveRequest = resolve
      }),
    )

    renderWithQueryClient(<ResetPasswordForm token="token-123" />)

    fireEvent.change(screen.getByLabelText('Nueva contraseña'), {
      target: { value: 'BrandNewPass123!' },
    })
    fireEvent.click(
      screen.getByRole('button', { name: 'Actualizar contraseña' }),
    )

    await waitFor(() => {
      const pendingButton = screen.getByRole('button', {
        name: 'Actualizando contraseña...',
      }) as HTMLButtonElement
      expect(pendingButton.disabled).toBe(true)
    })

    resolveRequest({ message: 'Password reset' })
    await screen.findByText('Contraseña actualizada')
  })

  it('shows API error inline and keeps recovery link visible', async () => {
    resetPasswordMock.mockRejectedValueOnce(
      new Error('Invalid or expired reset token'),
    )

    renderWithQueryClient(<ResetPasswordForm token="token-123" />)

    fireEvent.change(screen.getByLabelText('Nueva contraseña'), {
      target: { value: 'BrandNewPass123!' },
    })
    fireEvent.click(
      screen.getByRole('button', { name: 'Actualizar contraseña' }),
    )

    expect(
      await screen.findByText('Invalid or expired reset token'),
    ).toBeDefined()
    expect(
      screen.getByRole('link', { name: 'Solicitar nuevo enlace' }),
    ).toBeDefined()
  })

  it('does not render mixed success and error states after successful submit', async () => {
    resetPasswordMock.mockResolvedValueOnce({ message: 'Password reset' })

    renderWithQueryClient(<ResetPasswordForm token="token-123" />)

    fireEvent.change(screen.getByLabelText('Nueva contraseña'), {
      target: { value: 'BrandNewPass123!' },
    })
    fireEvent.click(
      screen.getByRole('button', { name: 'Actualizar contraseña' }),
    )

    await screen.findByText('Contraseña actualizada')
    expect(screen.queryByText('Invalid or expired reset token')).toBeNull()
  })
})
