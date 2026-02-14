// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { GetInsurerByIdResponse } from '@friendly-system/shared'

vi.mock('@/features/insurers/detail/ui/insurer-detail-main-tab', () => ({
  InsurerDetailMainTab: () => <div>mock-insurer-main-tab</div>,
}))

vi.mock(
  '@/features/insurers/detail/ui/history/insurer-detail-history-tab',
  () => ({
    InsurerDetailHistoryTab: ({ insurerId }: { insurerId: string }) => (
      <div>mock-insurer-history-tab:{insurerId}</div>
    ),
  }),
)

import { InsurerDetailTabs } from '@/features/insurers/detail/ui/insurer-detail-tabs'

const INSURER: GetInsurerByIdResponse = {
  id: '67f1d6ce-8a62-4d4f-8607-8f5a5e91f6ad',
  orgId: 'd6a9d8a4-e0e2-4e99-aece-798f9047e0a6',
  name: 'Sura Medicina Prepagada',
  type: 'MEDICINA_PREPAGADA',
  code: 'SURA',
  email: 'ops@sura.test',
  phone: '+57 300 000 0000',
  website: 'https://sura.test',
  isActive: true,
  createdAt: '2026-02-10T10:00:00.000Z',
  updatedAt: '2026-02-10T11:00:00.000Z',
}

describe('InsurerDetailTabs', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders tabs in expected order and history content when selected', () => {
    const { container } = render(
      <InsurerDetailTabs
        insurerId={INSURER.id}
        insurer={INSURER}
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
      container.querySelector('[data-slot="insurer-detail-tabs-scroll-fade"]'),
    ).not.toBeNull()
    expect(tabs.map((tab) => tab.textContent?.trim())).toEqual([
      'Principal',
      'Documentos',
      'Historial',
    ])

    const historyTabTrigger = screen.getByRole('tab', {
      name: 'Historial',
    })
    fireEvent.mouseDown(historyTabTrigger)
    fireEvent.click(historyTabTrigger)

    expect(
      screen.queryByText(`mock-insurer-history-tab:${INSURER.id}`),
    ).not.toBeNull()
  })
})
