// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'

const useInsurerHistoryControllerMock = vi.hoisted(() => vi.fn())

vi.mock(
  '@/features/insurers/detail/controller/use-insurer-history-controller',
  () => ({
    useInsurerHistoryController: useInsurerHistoryControllerMock,
  }),
)

import { InsurerDetailHistoryTab } from '@/features/insurers/detail/ui/history/insurer-detail-history-tab'

describe('InsurerDetailHistoryTab', () => {
  beforeEach(() => {
    useInsurerHistoryControllerMock.mockReset()
  })

  afterEach(() => {
    cleanup()
  })

  it('renders loading, error, empty and content states', () => {
    const onRetry = vi.fn()

    useInsurerHistoryControllerMock.mockReturnValueOnce({
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

    const { rerender } = render(
      <InsurerDetailHistoryTab insurerId="insurer-1" />,
    )
    expect(screen.queryByText('Sin actividad registrada')).toBeNull()

    useInsurerHistoryControllerMock.mockReturnValueOnce({
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

    rerender(<InsurerDetailHistoryTab insurerId="insurer-1" />)
    expect(screen.queryByText('No pudimos cargar esta sección')).not.toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(onRetry).toHaveBeenCalledTimes(1)

    useInsurerHistoryControllerMock.mockReturnValueOnce({
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

    rerender(<InsurerDetailHistoryTab insurerId="insurer-1" />)
    expect(screen.queryByText('Sin actividad registrada')).not.toBeNull()

    useInsurerHistoryControllerMock.mockReturnValueOnce({
      items: [
        {
          id: 'item-1',
          actionLabel: 'Aseguradora actualizada',
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

    rerender(<InsurerDetailHistoryTab insurerId="insurer-1" />)
    expect(screen.queryByText('Aseguradora actualizada')).not.toBeNull()
  })
})
