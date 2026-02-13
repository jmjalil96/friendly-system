// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { GetClaimByIdResponse } from '@friendly-system/shared'

vi.mock('@/features/claims/detail/ui/claim-detail-main-tab', () => ({
  ClaimDetailMainTab: () => <div>mock-main-tab</div>,
}))

vi.mock('@/features/claims/detail/ui/history/claim-detail-history-tab', () => ({
  ClaimDetailHistoryTab: ({ claimId }: { claimId: string }) => (
    <div>mock-history-tab:{claimId}</div>
  ),
}))

vi.mock(
  '@/features/claims/detail/ui/invoices/claim-detail-invoices-tab',
  () => ({
    ClaimDetailInvoicesTab: ({ claimId }: { claimId: string }) => (
      <div>mock-invoices-tab:{claimId}</div>
    ),
  }),
)

import { ClaimDetailTabs } from '@/features/claims/detail/ui/claim-detail-tabs'

const CLAIM: GetClaimByIdResponse = {
  id: '67f1d6ce-8a62-4d4f-8607-8f5a5e91f6ad',
  claimNumber: 25,
  status: 'IN_REVIEW',
  clientId: 'd6a9d8a4-e0e2-4e99-aece-798f9047e0a6',
  clientName: 'Empresas Alpha S.A.',
  affiliateId: 'b3f4fc33-6efa-45d0-b4dc-a84ca58e9f5b',
  affiliateFirstName: 'Carlos',
  affiliateLastName: 'Perez',
  patientId: 'ba7b5f90-1214-412d-b1bf-b41228d9f621',
  patientFirstName: 'Ana',
  patientLastName: 'Perez',
  policyId: null,
  policyNumber: null,
  policyInsurerName: null,
  description: 'Descripcion inicial',
  careType: null,
  diagnosis: null,
  amountSubmitted: null,
  amountApproved: null,
  amountDenied: null,
  amountUnprocessed: null,
  deductibleApplied: null,
  copayApplied: null,
  incidentDate: null,
  submittedDate: null,
  settlementDate: null,
  businessDays: null,
  settlementNumber: null,
  settlementNotes: null,
  createdById: '767d408a-fabf-47ca-971e-1f86d0cf26c5',
  updatedById: null,
  createdAt: '2026-02-10T10:00:00.000Z',
  updatedAt: '2026-02-10T11:00:00.000Z',
}

describe('ClaimDetailTabs', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders tabs in the expected order and historial content when selected', () => {
    const { container } = render(
      <ClaimDetailTabs
        claimId={CLAIM.id}
        claim={CLAIM}
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
      container.querySelector('[data-slot="claim-detail-tabs-scroll-fade"]'),
    ).not.toBeNull()
    expect(tabs.map((tab) => tab.textContent?.trim())).toEqual([
      'General',
      'Facturas',
      'Documentos',
      'Historial',
    ])
    expect(screen.queryByRole('tab', { name: 'Flujo' })).toBeNull()

    const historyTabTrigger = screen.getByRole('tab', { name: 'Historial' })
    fireEvent.mouseDown(historyTabTrigger)
    fireEvent.click(historyTabTrigger)

    expect(screen.queryByText(`mock-history-tab:${CLAIM.id}`)).not.toBeNull()
  })
})
