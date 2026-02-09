import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  forgotPasswordSchema,
  type ForgotPasswordInput,
  type ForgotPasswordResponse,
} from '@friendly-system/shared'
import { useForgotPassword } from '../hooks/use-auth'
import { Logo } from '../../../shared/components/logo'
import { AuthSuccessIcon } from './auth-status-icon'

export function ForgotPasswordForm() {
  const { forgotPassword, forgotPasswordStatus } = useForgotPassword()
  const isPending = forgotPasswordStatus === 'pending'
  const [success, setSuccess] = useState<ForgotPasswordResponse | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
  })

  const onSubmit = async (data: ForgotPasswordInput) => {
    try {
      const response = await forgotPassword(data)
      setSuccess(response)
    } catch {
      // Error already toasted by api.ts
    }
  }

  if (success) {
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
              Revisa tu correo
            </h2>
          </div>

          <div
            className="flex flex-col items-center"
            style={{
              gap: 'var(--space-md)',
              textAlign: 'center',
              fontSize: '0.875rem',
              color: 'var(--color-gray-600)',
            }}
          >
            <p>{success.message}</p>
            <p
              className="font-semibold"
              style={{ color: 'var(--color-gray-900)' }}
            >
              {success.email}
            </p>
          </div>

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
            Recuperar contraseña
          </h2>
          <p
            style={{
              fontSize: '0.875rem',
              color: 'var(--color-gray-600)',
            }}
          >
            Te enviaremos un enlace para restablecer tu contraseña.
          </p>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col"
          style={{ gap: 'var(--space-xl)' }}
          noValidate
        >
          <div className="flex flex-col" style={{ gap: 'var(--space-xs)' }}>
            <label
              htmlFor="email"
              className="font-semibold"
              style={{ fontSize: '0.8rem', color: 'var(--color-gray-600)' }}
            >
              Correo electrónico
            </label>
            <input
              id="email"
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
                style={{ fontSize: '0.75rem', color: 'var(--color-red-500)' }}
              >
                {errors.email.message}
              </p>
            )}
          </div>

          <button
            type="submit"
            className="auth-submit"
            disabled={isPending}
          >
            {isPending ? 'Enviando enlace...' : 'Enviar enlace'}
          </button>
        </form>

        <div
          className="flex items-center justify-center"
          style={{ gap: 'var(--space-md)', fontSize: '0.8rem' }}
        >
          <Link to="/login" replace className="auth-link">
            Volver a login
          </Link>
          <span style={{ color: 'var(--color-gray-300)' }}>•</span>
          <Link to="/register" replace className="auth-link">
            Crear cuenta
          </Link>
        </div>
      </div>
    </div>
  )
}
