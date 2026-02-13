// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'

const useClientHistoryControllerMock = vi.hoisted(() => vi.fn())

vi.mock(
  '@/features/clients/detail/controller/use-client-history-controller',
  () => ({
    useClientHistoryController: useClientHistoryControllerMock,
  }),
)

import { ClientDetailHistoryTab } from '@/features/clients/detail/ui/history/client-detail-history-tab'

describe('ClientDetailHistoryTab', () => {
  beforeEach(() => {
    useClientHistoryControllerMock.mockReset()
  })

  afterEach(() => {
    cleanup()
  })

  it('renders loading, error, empty and content states', () => {
    const onRetry = vi.fn()

    useClientHistoryControllerMock.mockReturnValueOnce({
      items: [],
      isLoading: true,
      isError: false,
      onRetry,
      pagination: {
        page: 1,
        limit: 20,
        limitOptions: [10, 20],
        totalCount: 0,
        totalPages: 1,
        onFirstPage: vi.fn(),
        onPreviousPage: vi.fn(),
        onNextPage: vi.fn(),
        onLastPage: vi.fn(),
        onLimitChange: vi.fn(),
      },
    })

    const { rerender } = render(<ClientDetailHistoryTab clientId="client-1" />)
    expect(screen.queryByText('Sin actividad registrada')).toBeNull()

    useClientHistoryControllerMock.mockReturnValueOnce({
      items: [],
      isLoading: false,
      isError: true,
      onRetry,
      pagination: {
        page: 1,
        limit: 20,
        limitOptions: [10, 20],
        totalCount: 0,
        totalPages: 1,
        onFirstPage: vi.fn(),
        onPreviousPage: vi.fn(),
        onNextPage: vi.fn(),
        onLastPage: vi.fn(),
        onLimitChange: vi.fn(),
      },
    })

    rerender(<ClientDetailHistoryTab clientId="client-1" />)
    expect(screen.queryByText('No pudimos cargar esta sección')).not.toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(onRetry).toHaveBeenCalledTimes(1)

    useClientHistoryControllerMock.mockReturnValueOnce({
      items: [],
      isLoading: false,
      isError: false,
      onRetry,
      pagination: {
        page: 1,
        limit: 20,
        limitOptions: [10, 20],
        totalCount: 0,
        totalPages: 1,
        onFirstPage: vi.fn(),
        onPreviousPage: vi.fn(),
        onNextPage: vi.fn(),
        onLastPage: vi.fn(),
        onLimitChange: vi.fn(),
      },
    })

    rerender(<ClientDetailHistoryTab clientId="client-1" />)
    expect(screen.queryByText('Sin actividad registrada')).not.toBeNull()

    useClientHistoryControllerMock.mockReturnValueOnce({
      items: [
        {
          id: 'item-1',
          actionLabel: 'Cliente actualizado',
          actionToneClassName: 'tone',
          createdAtLabel: '10 feb 2026',
          userLabel: 'Usuario',
          metadataLines: ['Evento registrado'],
        },
      ],
      isLoading: false,
      isError: false,
      onRetry,
      pagination: {
        page: 1,
        limit: 20,
        limitOptions: [10, 20],
        totalCount: 1,
        totalPages: 1,
        onFirstPage: vi.fn(),
        onPreviousPage: vi.fn(),
        onNextPage: vi.fn(),
        onLastPage: vi.fn(),
        onLimitChange: vi.fn(),
      },
    })

    rerender(<ClientDetailHistoryTab clientId="client-1" />)
    expect(screen.queryByText('Cliente actualizado')).not.toBeNull()
  })
})
