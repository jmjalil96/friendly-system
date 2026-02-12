// @vitest-environment jsdom
import type { ComponentType, ReactElement } from 'react'
import { isValidElement } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { Navigate, type ErrorComponentProps } from '@tanstack/react-router'
import { DEFAULT_CLAIMS_LIST_SEARCH } from '@/features/claims/model/claims.search'

vi.mock('@/features/claims', () => ({
  ClaimDetailPage: ({
    claimId,
    onBack,
  }: {
    claimId: string
    onBack: () => void
  }) => (
    <button type="button" onClick={onBack}>
      mock-detail-page:{claimId}
    </button>
  ),
}))

vi.mock('@/app/shell/error-fallback', () => ({
  ErrorFallback: () => <div>mock-error-fallback</div>,
}))

import { Route } from '@/routes/_authenticated/reclamos/$id'

function renderPage() {
  const Component = Route.options.component as ComponentType
  return render(<Component />)
}

describe('reclamos detail route', () => {
  const navigateMock = vi.fn()

  beforeEach(() => {
    navigateMock.mockReset()
    navigateMock.mockResolvedValue(undefined)

    vi.spyOn(Route, 'useParams').mockReturnValue({ id: 'claim-id' })
    vi.spyOn(Route, 'useNavigate').mockReturnValue(navigateMock)
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('maps route params into detail page props and wires back navigation', () => {
    renderPage()

    expect(screen.queryByText('mock-detail-page:claim-id')).not.toBeNull()

    fireEvent.click(screen.getByRole('button', { name: /mock-detail-page/i }))

    expect(navigateMock).toHaveBeenCalledWith({
      to: '/reclamos',
      search: DEFAULT_CLAIMS_LIST_SEARCH,
    })
  })

  it('validates route param id as uuid', () => {
    const parseParams = Route.options.params?.parse as
      | ((params: { id: string }) => { id: string })
      | undefined

    expect(parseParams).toBeTypeOf('function')
    expect(() => parseParams?.({ id: 'not-a-uuid' })).toThrow()
  })

  it('configures route-level error handling for invalid ids', () => {
    expect(Route.options.errorComponent).toBeTypeOf('function')
  })

  it('redirects invalid-claim-id validation errors to list route', () => {
    const errorComponent = Route.options.errorComponent as (
      props: ErrorComponentProps,
    ) => ReactElement

    const element = errorComponent({
      error: {
        issues: [
          {
            path: ['id'],
          },
        ],
      },
      reset: vi.fn(),
    } as unknown as ErrorComponentProps)

    expect(isValidElement(element)).toBe(true)
    expect(element.type).toBe(Navigate)
    expect(element.props).toMatchObject({
      to: '/reclamos',
      search: DEFAULT_CLAIMS_LIST_SEARCH,
      replace: true,
    })
  })

  it('falls back to generic route error UI for non-id errors', () => {
    const errorComponent = Route.options.errorComponent as (
      props: ErrorComponentProps,
    ) => ReactElement

    const element = errorComponent({
      error: new Error('network'),
      reset: vi.fn(),
    } as unknown as ErrorComponentProps)

    render(element)

    expect(screen.queryByText('mock-error-fallback')).not.toBeNull()
  })
})
