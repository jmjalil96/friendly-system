import type { ReactNode } from 'react'

function AuthStatusIcon({ children, color }: { children: ReactNode; color: string }) {
  return (
    <div
      style={{
        position: 'relative',
        width: '96px',
        height: '96px',
      }}
    >
      <span
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          background: 'var(--color-blue-500)',
          opacity: 0.08,
        }}
      />
      <span
        style={{
          position: 'absolute',
          inset: '14px',
          borderRadius: '50%',
          background: color,
          opacity: 0.12,
        }}
      />
      <span
        style={{
          position: 'absolute',
          inset: '28px',
          borderRadius: '50%',
          background: color,
          opacity: 0.2,
        }}
      />
      <svg
        width="32"
        height="32"
        viewBox="0 0 32 32"
        fill="none"
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
        }}
      >
        {children}
      </svg>
    </div>
  )
}

export function AuthSuccessIcon() {
  return (
    <AuthStatusIcon color="var(--color-green-500)">
      <path
        d="M8 17l5.5 5.5L24 10"
        stroke="var(--color-green-500)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </AuthStatusIcon>
  )
}

export function AuthErrorIcon() {
  return (
    <AuthStatusIcon color="var(--color-red-500)">
      <path
        d="M10 10l12 12M22 10L10 22"
        stroke="var(--color-red-500)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </AuthStatusIcon>
  )
}
