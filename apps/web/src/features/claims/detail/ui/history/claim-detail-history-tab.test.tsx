// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'

const useClaimHistoryControllerMock = vi.hoisted(() => vi.fn())

vi.mock('@/features/claims/detail/controller/use-claim-history-controller', () => ({
  useClaimHistoryController: useClaimHistoryControllerMock,
}))

import { ClaimDetailHistoryTab } from '@/features/claims/detail/ui/history/claim-detail-history-tab'

function makeViewModel() {
  return {
    historySection: {
      items: [] as Array<{
        id: string
        fromStatusLabel: string
        toStatusLabel: string
        createdByLabel: string
        createdAtLabel: string
        reason?: string
        notes?: string
      }>,
      isLoading: false,
      isError: false,
      onRetry: vi.fn(),
      pagination: {
        page: 1,
        limit: 20,
        limitOptions: [10, 20, 50, 100] as const,
        totalCount: 0,
        totalPages: 1,
        onFirstPage: vi.fn(),
        onPreviousPage: vi.fn(),
        onNextPage: vi.fn(),
        onLastPage: vi.fn(),
        onLimitChange: vi.fn(),
      },
    },
    timelineSection: {
      items: [] as Array<{
        id: string
        actionLabel: string
        actionToneClassName: string
        createdAtLabel: string
        userLabel: string
        metadataLines: string[]
      }>,
      isLoading: false,
      isError: false,
      onRetry: vi.fn(),
      pagination: {
        page: 1,
        limit: 20,
        limitOptions: [10, 20, 50, 100] as const,
        totalCount: 0,
        totalPages: 1,
        onFirstPage: vi.fn(),
        onPreviousPage: vi.fn(),
        onNextPage: vi.fn(),
        onLastPage: vi.fn(),
        onLimitChange: vi.fn(),
      },
    },
  }
}

describe('ClaimDetailHistoryTab', () => {
  beforeEach(() => {
    useClaimHistoryControllerMock.mockReset()
  })

  afterEach(() => {
    cleanup()
  })

  it('renders both sections and loading skeletons', () => {
    const view = makeViewModel()
    view.historySection.isLoading = true
    view.timelineSection.isLoading = true
    useClaimHistoryControllerMock.mockReturnValue(view)

    const { container } = render(<ClaimDetailHistoryTab claimId="claim-id-1" />)

    expect(screen.queryByText('Transiciones')).not.toBeNull()
    expect(screen.queryByText('Actividad')).not.toBeNull()
    expect(container.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0)
  })

  it('renders independent error states and retries per section', () => {
    const view = makeViewModel()
    view.historySection.isError = true
    view.timelineSection.isError = true
    useClaimHistoryControllerMock.mockReturnValue(view)

    render(<ClaimDetailHistoryTab claimId="claim-id-1" />)

    const retryButtons = screen.getAllByRole('button', { name: 'Reintentar' })
    fireEvent.click(retryButtons[0] as HTMLElement)
    fireEvent.click(retryButtons[1] as HTMLElement)

    expect(view.historySection.onRetry).toHaveBeenCalledTimes(1)
    expect(view.timelineSection.onRetry).toHaveBeenCalledTimes(1)
  })

  it('renders section empty states when no data exists', () => {
    const view = makeViewModel()
    useClaimHistoryControllerMock.mockReturnValue(view)

    render(<ClaimDetailHistoryTab claimId="claim-id-1" />)

    expect(screen.queryByText('Sin transiciones registradas')).not.toBeNull()
    expect(screen.queryByText('Sin actividad registrada')).not.toBeNull()
  })

  it('renders slim cards and routes pagination controls to each section', () => {
    const view = makeViewModel()
    view.historySection.items = [
      {
        id: 'transition-1',
        fromStatusLabel: 'Borrador',
        toStatusLabel: 'En revisión',
        createdByLabel: 'Carlos Pérez',
        createdAtLabel: '10 feb 2026, 10:00',
        reason: 'Revisión inicial',
      },
    ]
    view.historySection.pagination.totalCount = 1
    view.historySection.pagination.totalPages = 2

    view.timelineSection.items = [
      {
        id: 'timeline-1',
        actionLabel: 'Reclamo actualizado',
        actionToneClassName: 'bg-[var(--color-blue-50)] text-[var(--color-blue-700)]',
        createdAtLabel: '10 feb 2026, 09:00',
        userLabel: 'Carlos Pérez',
        metadataLines: ['Campos actualizados (1): description'],
      },
    ]
    view.timelineSection.pagination.totalCount = 1
    view.timelineSection.pagination.totalPages = 2
    useClaimHistoryControllerMock.mockReturnValue(view)

    render(<ClaimDetailHistoryTab claimId="claim-id-1" />)

    expect(screen.queryByText('Borrador -> En revisión')).not.toBeNull()
    expect(screen.queryByText('Reclamo actualizado')).not.toBeNull()
    expect(screen.queryAllByText(/Carlos Pérez/).length).toBeGreaterThan(0)
    expect(
      screen.queryByText('Campos actualizados (1): description'),
    ).not.toBeNull()

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Página siguiente de transiciones',
      }),
    )
    fireEvent.click(
      screen.getByRole('button', {
        name: 'Página siguiente de actividad',
      }),
    )

    expect(view.historySection.pagination.onNextPage).toHaveBeenCalledTimes(1)
    expect(view.timelineSection.pagination.onNextPage).toHaveBeenCalledTimes(1)
  })
})
