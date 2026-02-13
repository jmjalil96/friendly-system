// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { GetClientByIdResponse } from '@friendly-system/shared'

vi.mock('@/features/clients/detail/ui/client-detail-main-tab', () => ({
  ClientDetailMainTab: () => <div>mock-client-main-tab</div>,
}))

vi.mock(
  '@/features/clients/detail/ui/history/client-detail-history-tab',
  () => ({
    ClientDetailHistoryTab: ({ clientId }: { clientId: string }) => (
      <div>mock-client-history-tab:{clientId}</div>
    ),
  }),
)

vi.mock(
  '@/features/clients/detail/ui/related/client-detail-related-records-tab',
  () => ({
    ClientDetailRelatedRecordsTab: ({ clientId }: { clientId: string }) => (
      <div>mock-client-related-tab:{clientId}</div>
    ),
  }),
)

import { ClientDetailTabs } from '@/features/clients/detail/ui/client-detail-tabs'

const CLIENT: GetClientByIdResponse = {
  id: '67f1d6ce-8a62-4d4f-8607-8f5a5e91f6ad',
  orgId: 'd6a9d8a4-e0e2-4e99-aece-798f9047e0a6',
  name: 'Empresas Alpha S.A.',
  isActive: true,
  createdAt: '2026-02-10T10:00:00.000Z',
  updatedAt: '2026-02-10T11:00:00.000Z',
}

describe('ClientDetailTabs', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders tabs in expected order and related records content when selected', () => {
    const { container } = render(
      <ClientDetailTabs
        clientId={CLIENT.id}
        client={CLIENT}
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
      container.querySelector('[data-slot="client-detail-tabs-scroll-fade"]'),
    ).not.toBeNull()
    expect(tabs.map((tab) => tab.textContent?.trim())).toEqual([
      'Principal',
      'Documentos',
      'Historial',
      'Registros relacionados',
    ])

    const relatedTabTrigger = screen.getByRole('tab', {
      name: 'Registros relacionados',
    })
    fireEvent.mouseDown(relatedTabTrigger)
    fireEvent.click(relatedTabTrigger)

    expect(
      screen.queryByText(`mock-client-related-tab:${CLIENT.id}`),
    ).not.toBeNull()
  })
})
