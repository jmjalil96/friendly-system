// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'

const usePolicyHistoryControllerMock = vi.hoisted(() => vi.fn())

vi.mock(
  '@/features/policies/detail/controller/use-policy-history-controller',
  () => ({
    usePolicyHistoryController: usePolicyHistoryControllerMock,
  }),
)

import { PolicyDetailHistoryTab } from '@/features/policies/detail/ui/history/policy-detail-history-tab'

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

describe('PolicyDetailHistoryTab', () => {
  beforeEach(() => {
    usePolicyHistoryControllerMock.mockReset()
  })

  afterEach(() => {
    cleanup()
  })

  it('renders both sections and loading skeletons', () => {
    const view = makeViewModel()
    view.historySection.isLoading = true
    view.timelineSection.isLoading = true
    usePolicyHistoryControllerMock.mockReturnValue(view)

    const { container } = render(
      <PolicyDetailHistoryTab policyId="policy-id-1" />,
    )

    expect(screen.queryByText('Transiciones')).not.toBeNull()
    expect(screen.queryByText('Actividad')).not.toBeNull()
    expect(
      container.querySelectorAll('[data-slot="skeleton"]').length,
    ).toBeGreaterThan(0)
  })

  it('renders independent error states and retries per section', () => {
    const view = makeViewModel()
    view.historySection.isError = true
    view.timelineSection.isError = true
    usePolicyHistoryControllerMock.mockReturnValue(view)

    render(<PolicyDetailHistoryTab policyId="policy-id-1" />)

    const retryButtons = screen.getAllByRole('button', { name: 'Reintentar' })
    fireEvent.click(retryButtons[0] as HTMLElement)
    fireEvent.click(retryButtons[1] as HTMLElement)

    expect(view.historySection.onRetry).toHaveBeenCalledTimes(1)
    expect(view.timelineSection.onRetry).toHaveBeenCalledTimes(1)
  })

  it('renders section empty states when no data exists', () => {
    const view = makeViewModel()
    usePolicyHistoryControllerMock.mockReturnValue(view)

    render(<PolicyDetailHistoryTab policyId="policy-id-1" />)

    expect(screen.queryByText('Sin transiciones registradas')).not.toBeNull()
    expect(screen.queryByText('Sin actividad registrada')).not.toBeNull()
  })
})
