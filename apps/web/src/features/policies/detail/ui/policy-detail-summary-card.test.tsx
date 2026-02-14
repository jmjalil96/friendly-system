// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { PolicyDetailSummaryCard } from '@/features/policies/detail/ui/policy-detail-summary-card'

describe('PolicyDetailSummaryCard', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders resolved names when available', () => {
    render(
      <PolicyDetailSummaryCard
        statusLabel="Activa"
        statusClassName="bg-[var(--color-green-50)] text-[var(--color-green-700)]"
        items={[
          { label: 'Cliente', value: 'Empresas Alpha S.A.' },
          { label: 'Aseguradora', value: 'Aseguradora Uno' },
          { label: 'Número', value: 'POL-001' },
        ]}
      />,
    )

    expect(screen.queryByText('Empresas Alpha S.A.')).not.toBeNull()
    expect(screen.queryByText('Aseguradora Uno')).not.toBeNull()
    expect(screen.queryByText('POL-001')).not.toBeNull()
  })

  it('renders fallback values and has no actions', () => {
    render(
      <PolicyDetailSummaryCard
        items={[
          { label: 'Cliente', value: 'client-id-001' },
          { label: 'Aseguradora', value: 'insurer-id-001' },
          { label: 'Número', value: 'policy-id-001' },
        ]}
      />,
    )

    expect(screen.queryByText('client-id-001')).not.toBeNull()
    expect(screen.queryByText('insurer-id-001')).not.toBeNull()
    expect(screen.queryByText('policy-id-001')).not.toBeNull()
    expect(screen.queryAllByRole('button')).toHaveLength(0)
  })
})
