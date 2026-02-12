import { Link, type ErrorComponentProps } from '@tanstack/react-router'
import { Logo } from './logo'

export function ErrorFallback({ error, reset }: ErrorComponentProps) {
  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center gap-8 px-6"
      style={{ fontFamily: 'var(--font-family)' }}
    >
      <Logo variant="dark" size="sm" />

      {/* Card */}
      <div
        className="flex w-full max-w-sm flex-col items-center gap-6 p-8 text-center"
        style={{
          background: 'rgba(0, 78, 137, 0.04)',
          border: '1.5px solid rgba(0, 78, 137, 0.1)',
          borderRadius: 'var(--radius-lg)',
        }}
      >
        {/* Icon */}
        <div
          className="flex h-14 w-14 items-center justify-center rounded-full"
          style={{
            background: 'rgba(192, 0, 33, 0.07)',
            border: '1.5px solid rgba(192, 0, 33, 0.2)',
          }}
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--color-red-500)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>

        {/* Copy */}
        <div className="flex flex-col gap-2">
          <h1
            className="text-xl font-bold tracking-tight"
            style={{ color: 'var(--color-gray-900)' }}
          >
            Algo salió mal
          </h1>
          <p
            className="text-sm leading-relaxed"
            style={{ color: 'var(--color-gray-500)' }}
          >
            Ocurrió un error inesperado. Intenta de nuevo o vuelve al inicio.
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={reset}
            className="cursor-pointer px-5 py-2.5 text-sm font-semibold text-white"
            style={{
              background: 'var(--color-red-500)',
              borderRadius: 'var(--radius-lg)',
              border: 'none',
              transition: 'background var(--transition-base)',
            }}
            onMouseOver={(e) =>
              (e.currentTarget.style.background = 'var(--color-red-700)')
            }
            onMouseOut={(e) =>
              (e.currentTarget.style.background = 'var(--color-red-500)')
            }
          >
            Reintentar
          </button>
          <Link
            to="/"
            className="flex items-center px-5 py-2.5 text-sm font-medium"
            style={{
              color: 'var(--color-gray-600)',
              borderRadius: 'var(--radius-lg)',
              border: '1.5px solid var(--color-gray-200)',
              transition: 'border-color var(--transition-fast)',
            }}
          >
            Ir al inicio
          </Link>
        </div>

        {/* Dev-only error details */}
        {import.meta.env.DEV && (
          <details
            className="w-full text-left"
            style={{ color: 'var(--color-gray-500)' }}
          >
            <summary className="cursor-pointer text-xs font-medium">
              Detalles del error
            </summary>
            <pre
              className="mt-2 overflow-auto whitespace-pre-wrap break-words p-3 text-xs"
              style={{
                background: 'var(--color-gray-100)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--color-gray-600)',
                maxHeight: '200px',
              }}
            >
              {error instanceof Error
                ? `${error.message}\n\n${error.stack}`
                : String(error)}
            </pre>
          </details>
        )}
      </div>
    </div>
  )
}
