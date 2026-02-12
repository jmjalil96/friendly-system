import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from '@tanstack/react-router'
import {
  registerSchema,
  type RegisterInput,
  type RegisterResponse,
} from '@friendly-system/shared'
import { useRegister } from '@/features/auth/api/auth.hooks'
import { Logo } from '@/app/shell/logo'
import { AuthSuccessIcon } from './auth-status-icon'

export function RegisterForm() {
  const { register: registerUser, registerStatus } = useRegister()
  const isPending = registerStatus === 'pending'
  const [success, setSuccess] = useState<RegisterResponse | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
  })

  const onSubmit = async (data: RegisterInput) => {
    try {
      const response = await registerUser(data)
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
        {/* Header */}
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
            Crea tu cuenta
          </h2>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col"
          style={{ gap: 'var(--space-xl)' }}
          noValidate
        >
          <div className="flex" style={{ gap: 'var(--space-md)' }}>
            <div
              className="flex flex-1 flex-col"
              style={{ gap: 'var(--space-xs)' }}
            >
              <label
                htmlFor="firstName"
                className="font-semibold"
                style={{ fontSize: '0.8rem', color: 'var(--color-gray-600)' }}
              >
                Nombre
              </label>
              <input
                id="firstName"
                type="text"
                className="auth-input"
                placeholder="Juan"
                autoComplete="given-name"
                aria-invalid={!!errors.firstName}
                {...register('firstName')}
              />
              {errors.firstName && (
                <p
                  role="alert"
                  style={{
                    fontSize: '0.75rem',
                    color: 'var(--color-red-500)',
                  }}
                >
                  {errors.firstName.message}
                </p>
              )}
            </div>

            <div
              className="flex flex-1 flex-col"
              style={{ gap: 'var(--space-xs)' }}
            >
              <label
                htmlFor="lastName"
                className="font-semibold"
                style={{ fontSize: '0.8rem', color: 'var(--color-gray-600)' }}
              >
                Apellido
              </label>
              <input
                id="lastName"
                type="text"
                className="auth-input"
                placeholder="Pérez"
                autoComplete="family-name"
                aria-invalid={!!errors.lastName}
                {...register('lastName')}
              />
              {errors.lastName && (
                <p
                  role="alert"
                  style={{
                    fontSize: '0.75rem',
                    color: 'var(--color-red-500)',
                  }}
                >
                  {errors.lastName.message}
                </p>
              )}
            </div>
          </div>

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

          <div className="flex flex-col" style={{ gap: 'var(--space-xs)' }}>
            <label
              htmlFor="password"
              className="font-semibold"
              style={{ fontSize: '0.8rem', color: 'var(--color-gray-600)' }}
            >
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              className="auth-input"
              placeholder="Mínimo 8 caracteres"
              autoComplete="new-password"
              aria-invalid={!!errors.password}
              {...register('password')}
            />
            {errors.password && (
              <p
                role="alert"
                style={{ fontSize: '0.75rem', color: 'var(--color-red-500)' }}
              >
                {errors.password.message}
              </p>
            )}
          </div>

          <div className="flex flex-col" style={{ gap: 'var(--space-xs)' }}>
            <label
              htmlFor="orgName"
              className="font-semibold"
              style={{ fontSize: '0.8rem', color: 'var(--color-gray-600)' }}
            >
              Nombre de la empresa
            </label>
            <input
              id="orgName"
              type="text"
              className="auth-input"
              placeholder="Mi Empresa S.A."
              autoComplete="organization"
              aria-invalid={!!errors.orgName}
              {...register('orgName')}
            />
            {errors.orgName && (
              <p
                role="alert"
                style={{ fontSize: '0.75rem', color: 'var(--color-red-500)' }}
              >
                {errors.orgName.message}
              </p>
            )}
          </div>

          <button type="submit" className="auth-submit" disabled={isPending}>
            {isPending ? 'Creando cuenta...' : 'Crear cuenta'}
          </button>
        </form>

        <Link
          to="/login"
          replace
          className="auth-link"
          style={{ fontSize: '0.8rem', textAlign: 'center' }}
        >
          ¿Ya tienes cuenta? Inicia sesión
        </Link>
      </div>
    </div>
  )
}
