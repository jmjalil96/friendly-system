import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  resetPasswordSchema,
  type ResetPasswordInput,
} from '@friendly-system/shared'
import { useResetPassword } from '../hooks/use-auth'
import { Logo } from '@/components/layout/logo'
import { AuthErrorIcon, AuthSuccessIcon } from './auth-status-icon'

const resetPasswordFormSchema = resetPasswordSchema.pick({ newPassword: true })
type ResetPasswordFormInput = Pick<ResetPasswordInput, 'newPassword'>

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }

  return 'Ocurrió un error inesperado.'
}

function MissingTokenState() {
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
          No se proporcionó un token de restablecimiento.
        </p>
        <Link
          to="/forgot-password"
          replace
          className="auth-link"
          style={{ fontSize: '0.8rem', textAlign: 'center' }}
        >
          Solicitar nuevo enlace
        </Link>
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
            Contraseña actualizada
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

function ErrorState({
  message,
  onRetry,
}: {
  message: string
  onRetry: () => void
}) {
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
              textAlign: 'center',
            }}
          >
            No pudimos restablecer tu contraseña
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
        <button type="button" className="auth-submit" onClick={onRetry}>
          Intentar de nuevo
        </button>
        <Link
          to="/forgot-password"
          replace
          className="auth-link"
          style={{ fontSize: '0.8rem', textAlign: 'center' }}
        >
          Solicitar nuevo enlace
        </Link>
      </div>
    </div>
  )
}

export function ResetPasswordForm({ token }: { token: string }) {
  const { resetPassword, resetPasswordStatus } = useResetPassword()
  const isPending = resetPasswordStatus === 'pending'
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormInput>({
    resolver: zodResolver(resetPasswordFormSchema),
  })

  if (!token) {
    return <MissingTokenState />
  }

  if (successMessage) {
    return <SuccessState message={successMessage} />
  }

  if (submitError) {
    return (
      <ErrorState
        message={submitError}
        onRetry={() => {
          setSubmitError(null)
        }}
      />
    )
  }

  const onSubmit = async (data: ResetPasswordFormInput) => {
    if (isPending) {
      return
    }

    setSubmitError(null)

    try {
      const response = await resetPassword({
        token,
        newPassword: data.newPassword,
      })
      setSuccessMessage(response.message)
    } catch (error) {
      setSubmitError(getErrorMessage(error))
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
        className="flex w-full flex-col"
        style={{ maxWidth: '380px', gap: 'var(--space-2xl)' }}
      >
        <div className="flex flex-col" style={{ gap: 'var(--space-lg)' }}>
          <Logo variant="dark" size="sm" />
          <h2
            className="font-bold"
            style={{
              fontSize: '1.5rem',
              color: 'var(--color-gray-900)',
              letterSpacing: '-0.02em',
            }}
          >
            Restablecer contraseña
          </h2>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col"
          style={{ gap: 'var(--space-xl)' }}
          noValidate
        >
          <div className="flex flex-col" style={{ gap: 'var(--space-xs)' }}>
            <label
              htmlFor="newPassword"
              className="font-semibold"
              style={{ fontSize: '0.8rem', color: 'var(--color-gray-600)' }}
            >
              Nueva contraseña
            </label>
            <input
              id="newPassword"
              type="password"
              className="auth-input"
              placeholder="Mínimo 8 caracteres"
              autoComplete="new-password"
              aria-invalid={!!errors.newPassword}
              {...register('newPassword')}
            />
            {errors.newPassword && (
              <p
                role="alert"
                style={{ fontSize: '0.75rem', color: 'var(--color-red-500)' }}
              >
                {errors.newPassword.message}
              </p>
            )}
          </div>

          <button type="submit" className="auth-submit" disabled={isPending}>
            {isPending ? 'Actualizando contraseña...' : 'Actualizar contraseña'}
          </button>
        </form>

        <div
          className="flex items-center justify-center"
          style={{ gap: 'var(--space-md)', fontSize: '0.8rem' }}
        >
          <Link to="/forgot-password" replace className="auth-link">
            Solicitar nuevo enlace
          </Link>
          <span style={{ color: 'var(--color-gray-300)' }}>•</span>
          <Link to="/login" replace className="auth-link">
            Volver a login
          </Link>
        </div>
      </div>
    </div>
  )
}
