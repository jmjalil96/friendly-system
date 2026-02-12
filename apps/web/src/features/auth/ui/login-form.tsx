import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { loginSchema, type LoginInput } from '@friendly-system/shared'
import { Link, useRouter } from '@tanstack/react-router'
import { useLogin } from '@/features/auth/api/auth.hooks'
import { Logo } from '@/app/shell/logo'

export function LoginForm() {
  const { login, loginStatus } = useLogin()
  const router = useRouter()
  const isPending = loginStatus === 'pending'

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginInput) => {
    try {
      await login(data)
      await router.invalidate()
      await router.navigate({ to: '/', replace: true })
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
            Inicia sesión
          </h2>
        </div>

        {/* Form */}
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
              placeholder="••••••••"
              autoComplete="current-password"
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

          <div
            className="flex items-center justify-end"
            style={{ fontSize: '0.8rem' }}
          >
            <Link to="/forgot-password" replace className="auth-link">
              ¿Olvidaste tu contraseña?
            </Link>
          </div>

          <button type="submit" className="auth-submit" disabled={isPending}>
            {isPending ? 'Iniciando sesión...' : 'Iniciar sesión'}
          </button>
        </form>

        <Link
          to="/register"
          replace
          className="auth-link"
          style={{ fontSize: '0.8rem', textAlign: 'center' }}
        >
          ¿No tienes cuenta? Crear cuenta
        </Link>
      </div>
    </div>
  )
}
