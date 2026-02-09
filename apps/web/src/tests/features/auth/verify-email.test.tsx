// @vitest-environment jsdom
import { StrictMode, type ReactElement, type ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { VerifyEmail } from '@/features/auth/components/verify-email'

const verifyEmailMock = vi.hoisted(() => vi.fn())
const resendVerificationMock = vi.hoisted(() => vi.fn())

vi.mock('@/features/auth/api', () => ({
  authApi: {
    verifyEmail: verifyEmailMock,
    resendVerification: resendVerificationMock,
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

function renderWithQueryClient(ui: ReactElement, strict = false) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  const tree = (
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  )

  return render(strict ? <StrictMode>{tree}</StrictMode> : tree)
}

describe('VerifyEmail', () => {
  afterEach(() => {
    cleanup()
  })

  beforeEach(() => {
    verifyEmailMock.mockReset()
    resendVerificationMock.mockReset()
  })

  it('shows missing-token state without calling verify API', () => {
    renderWithQueryClient(<VerifyEmail token="" />)

    expect(
      screen.getByText('No se proporcionó un token de verificación.'),
    ).toBeDefined()
    expect(verifyEmailMock).not.toHaveBeenCalled()
  })

  it('verifies token once in StrictMode and renders success state', async () => {
    verifyEmailMock.mockResolvedValueOnce({
      message: 'Correo verificado con éxito.',
    })

    renderWithQueryClient(<VerifyEmail token="token-123" />, true)

    expect(await screen.findByText('Correo verificado')).toBeDefined()
    expect(
      await screen.findByText('Correo verificado con éxito.'),
    ).toBeDefined()
    expect(screen.queryByText('Enlace inválido')).toBeNull()
    expect(verifyEmailMock).toHaveBeenCalledTimes(1)
    expect(verifyEmailMock).toHaveBeenCalledWith({ token: 'token-123' })
  })

  it('renders error state and resend form when verification fails', async () => {
    verifyEmailMock.mockRejectedValueOnce(
      new Error('Token inválido o expirado'),
    )

    renderWithQueryClient(<VerifyEmail token="invalid-token" />)

    expect(await screen.findByText('Enlace inválido')).toBeDefined()
    expect(await screen.findByText('Token inválido o expirado')).toBeDefined()
    expect(
      screen.getByLabelText('Reenviar correo de verificación'),
    ).toBeDefined()
  })

  it('resends verification email successfully from error state', async () => {
    verifyEmailMock.mockRejectedValueOnce(
      new Error('Token inválido o expirado'),
    )
    resendVerificationMock.mockResolvedValueOnce({ message: 'ok' })

    renderWithQueryClient(<VerifyEmail token="invalid-token" />)

    const emailInput = await screen.findByLabelText(
      'Reenviar correo de verificación',
    )
    fireEvent.change(emailInput, { target: { value: 'user@example.com' } })
    fireEvent.click(screen.getByRole('button', { name: 'Reenviar enlace' }))

    await screen.findByText(
      'Si el correo está registrado, recibirás un nuevo enlace de verificación.',
    )
    expect(resendVerificationMock).toHaveBeenCalledTimes(1)
    expect(resendVerificationMock.mock.calls[0]?.[0]).toEqual({
      email: 'user@example.com',
    })
  })

  it('does not render mixed success and error states for a successful verification', async () => {
    verifyEmailMock.mockResolvedValueOnce({ message: 'Todo correcto.' })

    renderWithQueryClient(<VerifyEmail token="token-abc" />, true)

    await screen.findByText('Correo verificado')
    await waitFor(() => {
      expect(screen.queryByText('Enlace inválido')).toBeNull()
    })
  })
})
