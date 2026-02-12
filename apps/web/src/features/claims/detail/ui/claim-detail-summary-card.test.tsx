// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { ClaimDetailSummaryCard } from '@/features/claims/detail/ui/claim-detail-summary-card'

describe('ClaimDetailSummaryCard', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders resolved names when available', () => {
    render(
      <ClaimDetailSummaryCard
        statusLabel="En revision"
        statusClassName="bg-[var(--color-amber-50)] text-[var(--color-amber-600)]"
        items={[
          { label: 'Cliente', value: 'Empresas Alpha S.A.' },
          { label: 'Afiliado', value: 'Carlos Perez' },
          { label: 'Paciente', value: 'Ana Perez' },
        ]}
      />,
    )

    expect(screen.queryByText('Empresas Alpha S.A.')).not.toBeNull()
    expect(screen.queryByText('Carlos Perez')).not.toBeNull()
    expect(screen.queryByText('Ana Perez')).not.toBeNull()
  })

  it('renders fallback IDs when names are unavailable and has no actions', () => {
    render(
      <ClaimDetailSummaryCard
        items={[
          { label: 'Cliente', value: 'client-id-001' },
          { label: 'Afiliado', value: 'affiliate-id-001' },
          { label: 'Paciente', value: 'patient-id-001' },
        ]}
      />,
    )

    expect(screen.queryByText('client-id-001')).not.toBeNull()
    expect(screen.queryByText('affiliate-id-001')).not.toBeNull()
    expect(screen.queryByText('patient-id-001')).not.toBeNull()
    expect(screen.queryAllByRole('button')).toHaveLength(0)
  })
})
