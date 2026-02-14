// @vitest-environment jsdom
import type { ComponentType, ReactElement } from 'react'
import { isValidElement } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { Navigate, type ErrorComponentProps } from '@tanstack/react-router'
import { DEFAULT_INSURERS_LIST_SEARCH } from '@/features/insurers/model/insurers.search'

vi.mock('@/features/insurers', () => ({
  InsurerDetailPage: ({
    insurerId,
    onBack,
  }: {
    insurerId: string
    onBack: () => void
  }) => (
    <button type="button" onClick={onBack}>
      mock-insurer-detail-page:{insurerId}
    </button>
  ),
}))

vi.mock('@/app/shell/error-fallback', () => ({
  ErrorFallback: () => <div>mock-error-fallback</div>,
}))

import { Route } from '@/routes/_authenticated/aseguradoras/$id'

function renderPage() {
  const Component = Route.options.component as ComponentType
  return render(<Component />)
}

describe('aseguradoras detail route', () => {
  const navigateMock = vi.fn()

  beforeEach(() => {
    navigateMock.mockReset()
    navigateMock.mockResolvedValue(undefined)

    vi.spyOn(Route, 'useParams').mockReturnValue({ id: 'insurer-id' })
    vi.spyOn(Route, 'useNavigate').mockReturnValue(navigateMock)
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('maps route params into detail page props and wires back navigation', () => {
    renderPage()

    expect(
      screen.queryByText('mock-insurer-detail-page:insurer-id'),
    ).not.toBeNull()

    fireEvent.click(
      screen.getByRole('button', { name: /mock-insurer-detail-page/i }),
    )

    expect(navigateMock).toHaveBeenCalledWith({
      to: '/aseguradoras',
      search: DEFAULT_INSURERS_LIST_SEARCH,
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

  it('redirects invalid-insurer-id validation errors to list route', () => {
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
      to: '/aseguradoras',
      search: DEFAULT_INSURERS_LIST_SEARCH,
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
