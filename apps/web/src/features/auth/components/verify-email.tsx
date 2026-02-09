import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  resendVerificationSchema,
  type ResendVerificationInput,
} from '@friendly-system/shared'
import { useVerifyEmail, useResendVerification } from '../hooks/use-auth'
import { AuthErrorIcon, AuthSuccessIcon } from './auth-status-icon'

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }

  return 'Ocurrió un error inesperado.'
}

export function VerifyEmail({ token }: { token: string }) {
  const verifyQuery = useVerifyEmail(token)

  if (!token) {
    return <ErrorState message="No se proporcionó un token de verificación." />
  }

  if (verifyQuery.isPending) {
    return <LoadingState />
  }

  if (verifyQuery.isSuccess) {
    return <SuccessState message={verifyQuery.data.message} />
  }

  return <ErrorState message={getErrorMessage(verifyQuery.error)} />
}

function LoadingState() {
  return (
    <div
      className="flex h-full items-center justify-center"
      style={{
        padding: 'clamp(1.25rem, 5vw, 2rem)',
        background: 'var(--color-gray-50)',
      }}
    >
      <div
        className="flex w-full flex-col items-center"
        style={{ maxWidth: '380px', gap: 'var(--space-2xl)' }}
      >
        <div
          className="flex flex-col items-center"
          style={{ gap: 'var(--space-lg)' }}
        >
          <div className="auth-spinner" />
          <h2
            className="font-bold"
            style={{
              fontSize: '1.5rem',
              color: 'var(--color-gray-900)',
              letterSpacing: '-0.02em',
            }}
          >
            Verificando tu correo...
          </h2>
        </div>

        <p
          style={{
            fontSize: '0.875rem',
            color: 'var(--color-gray-600)',
            textAlign: 'center',
          }}
        >
          Esto solo tomará un momento.
        </p>
      </div>
    </div>
  )
}

function SuccessState({ message }: { message: string }) {
  return (
    <div
      className="flex h-full items-center justify-center"
      style={{
        padding: 'clamp(1.25rem, 5vw, 2rem)',
        background: 'var(--color-gray-50)',
      }}
    >
      <div
        className="flex w-full flex-col items-center"
        style={{ maxWidth: '380px', gap: 'var(--space-2xl)' }}
      >
        <div
          className="flex flex-col items-center"
          style={{ gap: 'var(--space-lg)' }}
        >
          <AuthSuccessIcon />
          <h2
            className="font-bold"
            style={{
              fontSize: '1.5rem',
              color: 'var(--color-gray-900)',
              letterSpacing: '-0.02em',
            }}
          >
            Correo verificado
          </h2>
        </div>

        <p
          style={{
            fontSize: '0.875rem',
            color: 'var(--color-gray-600)',
            textAlign: 'center',
          }}
        >
          {message}
        </p>

        <Link
          to="/login"
          replace
          className="auth-link"
          style={{ fontSize: '0.8rem', textAlign: 'center' }}
        >
          Ir a iniciar sesión
        </Link>
      </div>
    </div>
  )
}

function ErrorState({ message }: { message: string }) {
  const [resent, setResent] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResendVerificationInput>({
    resolver: zodResolver(resendVerificationSchema),
  })

  const { resendVerification, resendVerificationStatus } =
    useResendVerification()
  const isResending = resendVerificationStatus === 'pending'

  const onResend = async (data: ResendVerificationInput) => {
    try {
      await resendVerification(data)
      setResent(true)
    } catch {
      // Error already toasted by api.ts
    }
  }

  return (
    <div
      className="flex h-full items-center justify-center"
      style={{
        padding: 'clamp(1.25rem, 5vw, 2rem)',
        background: 'var(--color-gray-50)',
      }}
    >
      <div
        className="flex w-full flex-col items-center"
        style={{ maxWidth: '380px', gap: 'var(--space-2xl)' }}
      >
        <div
          className="flex flex-col items-center"
          style={{ gap: 'var(--space-lg)' }}
        >
          <AuthErrorIcon />
          <h2
            className="font-bold"
            style={{
              fontSize: '1.5rem',
              color: 'var(--color-gray-900)',
              letterSpacing: '-0.02em',
            }}
          >
            Enlace inválido
          </h2>
        </div>

        <p
          style={{
            fontSize: '0.875rem',
            color: 'var(--color-gray-600)',
            textAlign: 'center',
          }}
        >
          {message}
        </p>

        {resent ? (
          <p
            className="font-semibold"
            style={{
              fontSize: '0.875rem',
              color: 'var(--color-gray-900)',
              textAlign: 'center',
            }}
          >
            Si el correo está registrado, recibirás un nuevo enlace de
            verificación.
          </p>
        ) : (
          <form
            onSubmit={handleSubmit(onResend)}
            className="flex w-full flex-col"
            style={{ gap: 'var(--space-xl)' }}
            noValidate
          >
            <div
              className="flex flex-col"
              style={{ gap: 'var(--space-xs)' }}
            >
              <label
                htmlFor="resend-email"
                className="font-semibold"
                style={{
                  fontSize: '0.8rem',
                  color: 'var(--color-gray-600)',
                }}
              >
                Reenviar correo de verificación
              </label>
              <input
                id="resend-email"
                type="email"
                className="auth-input"
                placeholder="nombre@empresa.com"
                autoComplete="email"
                aria-invalid={!!errors.email}
                {...register('email')}
              />
              {errors.email && (
                <p
                  role="alert"
                  style={{
                    fontSize: '0.75rem',
                    color: 'var(--color-red-500)',
                  }}
                >
                  {errors.email.message}
                </p>
              )}
            </div>

            <button
              type="submit"
              className="auth-submit"
              disabled={isResending}
            >
              {isResending ? 'Enviando...' : 'Reenviar enlace'}
            </button>
          </form>
        )}

        <Link
          to="/login"
          replace
          className="auth-link"
          style={{ fontSize: '0.8rem', textAlign: 'center' }}
        >
          Ir a iniciar sesión
        </Link>
      </div>
    </div>
  )
}
