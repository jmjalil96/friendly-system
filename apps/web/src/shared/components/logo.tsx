interface LogoProps {
  variant: 'dark' | 'light'
  size: 'sm' | 'lg'
}

const sizeStyles = {
  sm: { wordmark: '1.5rem', subtitle: '0.6rem' },
  lg: { wordmark: '2.75rem', subtitle: '0.8rem' },
} as const

export function Logo({ variant, size }: LogoProps) {
  const isDark = variant === 'dark'
  const { wordmark, subtitle } = sizeStyles[size]

  return (
    <div className="flex flex-col">
      <span
        className="flex font-bold"
        style={{ fontSize: wordmark, letterSpacing: '-0.03em', lineHeight: 1.1 }}
      >
        <span style={{ color: isDark ? 'var(--color-red-500)' : 'var(--color-white)' }}>
          Cotizate
        </span>
        <span style={{ color: isDark ? 'var(--color-blue-500)' : 'var(--color-white)' }}>
          Algo
        </span>
      </span>
      <span
        className="font-medium uppercase"
        style={{
          fontSize: subtitle,
          letterSpacing: '0.06em',
          color: isDark ? 'var(--color-gray-400)' : 'rgba(255, 255, 255, 0.5)',
        }}
      >
        Claims Manager
      </span>
    </div>
  )
}
