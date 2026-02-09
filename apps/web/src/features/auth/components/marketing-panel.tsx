import { Logo } from '@/components/layout/logo'

export function MarketingPanel() {
  return (
    <div className="marketing-panel">
      <div
        className="relative z-10 flex max-w-[420px] flex-col"
        style={{ gap: 'var(--space-2xl)' }}
      >
        <Logo variant="light" size="lg" />

        <div className="flex flex-col" style={{ gap: 'var(--space-md)' }}>
          <h2
            className="font-bold"
            style={{
              fontSize: 'clamp(1.75rem, 2.5vw, 2.5rem)',
              lineHeight: 1.15,
              letterSpacing: '-0.03em',
            }}
          >
            Reclamos resueltos,
            <br />
            <span style={{ color: 'var(--color-red-400)' }}>sin fricción.</span>
          </h2>
          <p
            style={{
              fontSize: '0.95rem',
              lineHeight: 1.6,
              color: 'rgba(255, 255, 255, 0.6)',
            }}
          >
            Tu equipo de RRHH y tus colaboradores en un solo lugar.
          </p>
        </div>

        <div
          className="flex"
          style={{
            gap: 'var(--space-lg)',
            padding: 'var(--space-lg)',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: 'var(--radius-lg)',
            backdropFilter: 'blur(8px)',
          }}
        >
          <Stat value="100%" label="Digital" />
          <Stat value="3x" label="Más rápido" />
          <Stat value="0" label="Papeles" />
        </div>
      </div>
    </div>
  )
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-1 flex-col" style={{ gap: '2px' }}>
      <span
        className="font-bold"
        style={{ fontSize: '1.5rem', letterSpacing: '-0.02em', lineHeight: 1 }}
      >
        {value}
      </span>
      <span
        className="font-medium uppercase"
        style={{
          fontSize: '0.7rem',
          letterSpacing: '0.06em',
          color: 'rgba(255, 255, 255, 0.4)',
        }}
      >
        {label}
      </span>
    </div>
  )
}
