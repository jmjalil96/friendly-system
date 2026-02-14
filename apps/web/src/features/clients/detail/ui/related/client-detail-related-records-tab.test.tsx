// @vitest-environment jsdom
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'

const useClientPoliciesControllerMock = vi.hoisted(() => vi.fn())

vi.mock(
  '@/features/clients/detail/controller/use-client-policies-controller',
  () => ({
    useClientPoliciesController: useClientPoliciesControllerMock,
  }),
)

vi.mock('@tanstack/react-router', async () => {
  const actual = await vi.importActual<typeof import('@tanstack/react-router')>(
    '@tanstack/react-router',
  )

  return {
    ...actual,
    Link: ({
      to,
      params,
      children,
      ...props
    }: {
      to: string
      params?: { id?: string }
      children: ReactNode
    } & Record<string, unknown>) => {
      const href = params?.id ? to.replace('$id', params.id) : to
      return (
        <a href={href} {...props}>
          {children}
        </a>
      )
    },
  }
})

import { ClientDetailRelatedRecordsTab } from '@/features/clients/detail/ui/related/client-detail-related-records-tab'

describe('ClientDetailRelatedRecordsTab', () => {
  beforeEach(() => {
    useClientPoliciesControllerMock.mockReset()
  })

  afterEach(() => {
    cleanup()
  })

  it('renders loading, error, empty and content states', () => {
    const onRetry = vi.fn()
    const onSearchInputChange = vi.fn()

    useClientPoliciesControllerMock.mockReturnValueOnce({
      items: [],
      isLoading: true,
      isError: false,
      searchInput: '',
      onSearchInputChange,
      pagination: { pageIndex: 0, pageSize: 20 },
      paginationMeta: { page: 1, limit: 20, totalCount: 0, totalPages: 0 },
      onPaginationChange: vi.fn(),
      onRetry,
    })

    const { rerender } = render(
      <ClientDetailRelatedRecordsTab clientId="client-1" />,
    )
    expect(screen.queryByText('No hay pólizas relacionadas')).toBeNull()

    useClientPoliciesControllerMock.mockReturnValueOnce({
      items: [],
      isLoading: false,
      isError: true,
      searchInput: '',
      onSearchInputChange,
      pagination: { pageIndex: 0, pageSize: 20 },
      paginationMeta: { page: 1, limit: 20, totalCount: 0, totalPages: 0 },
      onPaginationChange: vi.fn(),
      onRetry,
    })

    rerender(<ClientDetailRelatedRecordsTab clientId="client-1" />)
    expect(screen.queryByText('No pudimos cargar las pólizas')).not.toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(onRetry).toHaveBeenCalledTimes(1)

    useClientPoliciesControllerMock.mockReturnValueOnce({
      items: [],
      isLoading: false,
      isError: false,
      searchInput: '',
      onSearchInputChange,
      pagination: { pageIndex: 0, pageSize: 20 },
      paginationMeta: { page: 1, limit: 20, totalCount: 0, totalPages: 0 },
      onPaginationChange: vi.fn(),
      onRetry,
    })

    rerender(<ClientDetailRelatedRecordsTab clientId="client-1" />)
    expect(screen.queryByText('No hay pólizas relacionadas')).not.toBeNull()

    useClientPoliciesControllerMock.mockReturnValueOnce({
      items: [
        {
          id: 'policy-1',
          policyNumber: 'POL-123',
          type: 'HEALTH',
          status: 'ACTIVE',
          planName: 'Plan Corporativo',
          employeeClass: 'Administrativo',
          maxCoverage: '500000.00',
          deductible: '1200.00',
          startDate: '2026-01-01',
          endDate: '2026-12-31',
          insurerName: 'Insurer',
        },
      ],
      isLoading: false,
      isError: false,
      searchInput: '',
      onSearchInputChange,
      pagination: { pageIndex: 0, pageSize: 20 },
      paginationMeta: { page: 1, limit: 20, totalCount: 1, totalPages: 1 },
      onPaginationChange: vi.fn(),
      onRetry,
    })

    rerender(<ClientDetailRelatedRecordsTab clientId="client-1" />)
    expect(screen.queryByText('POL-123')).not.toBeNull()
  })
})
