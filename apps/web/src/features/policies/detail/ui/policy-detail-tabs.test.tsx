// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { GetPolicyByIdResponse } from '@friendly-system/shared'

vi.mock('@/features/policies/detail/ui/policy-detail-main-tab', () => ({
  PolicyDetailMainTab: () => <div>mock-main-tab</div>,
}))

vi.mock(
  '@/features/policies/detail/ui/history/policy-detail-history-tab',
  () => ({
    PolicyDetailHistoryTab: ({ policyId }: { policyId: string }) => (
      <div>mock-history-tab:{policyId}</div>
    ),
  }),
)

import { PolicyDetailTabs } from '@/features/policies/detail/ui/policy-detail-tabs'

const POLICY: GetPolicyByIdResponse = {
  id: '67f1d6ce-8a62-4d4f-8607-8f5a5e91f6ad',
  policyNumber: 'POL-001',
  status: 'PENDING',
  clientId: 'd6a9d8a4-e0e2-4e99-aece-798f9047e0a6',
  clientName: 'Empresas Alpha S.A.',
  insurerId: 'ba7b5f90-1214-412d-b1bf-b41228d9f621',
  insurerName: 'Aseguradora Uno',
  type: 'HEALTH',
  startDate: '2026-01-01',
  endDate: '2026-12-31',
  ambulatoryCoinsurancePct: null,
  hospitalaryCoinsurancePct: null,
  maternityCost: null,
  tPremium: null,
  tplus1Premium: null,
  tplusfPremium: null,
  benefitsCostPerPerson: null,
  maxCoverage: '500000.00',
  deductible: '1200.00',
  planName: 'Plan Corporativo',
  employeeClass: 'Administrativo',
  cancellationReason: null,
  cancelledAt: null,
  createdAt: '2026-02-10T10:00:00.000Z',
  updatedAt: '2026-02-10T11:00:00.000Z',
}

describe('PolicyDetailTabs', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders only General/Documentos/Historial tabs in order and shows history content', () => {
    const { container } = render(
      <PolicyDetailTabs
        policyId={POLICY.id}
        policy={POLICY}
        isLoading={false}
        isError={false}
        onRetry={vi.fn()}
      />,
    )

    const tabs = screen.getAllByRole('tab')
    expect(
      screen.queryByText('Desliza las pestañas para ver todas las secciones.'),
    ).not.toBeNull()
    expect(
      container.querySelector('[data-slot="policy-detail-tabs-scroll-fade"]'),
    ).not.toBeNull()
    expect(tabs.map((tab) => tab.textContent?.trim())).toEqual([
      'General',
      'Documentos',
      'Historial',
    ])
    expect(screen.queryByRole('tab', { name: 'Facturas' })).toBeNull()

    const historyTabTrigger = screen.getByRole('tab', { name: 'Historial' })
    fireEvent.mouseDown(historyTabTrigger)
    fireEvent.click(historyTabTrigger)

    expect(screen.queryByText(`mock-history-tab:${POLICY.id}`)).not.toBeNull()
  })
})
