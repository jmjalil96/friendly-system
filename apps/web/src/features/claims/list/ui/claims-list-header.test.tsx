// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { ClaimsListHeader } from '@/features/claims/list/ui/claims-list-header'

describe('ClaimsListHeader', () => {
  afterEach(() => {
    cleanup()
  })

  it('forwards custom className to shared page header root', () => {
    const { container } = render(
      <ClaimsListHeader
        onCreateClaim={vi.fn()}
        className="static z-auto shadow-none"
      />,
    )

    const pageHeader = container.querySelector('[data-slot="page-header"]')
    expect(pageHeader?.className).toContain('static')
    expect(pageHeader?.className).toContain('shadow-none')
  })

  it('invokes create action from header CTA', () => {
    const onCreateClaim = vi.fn()

    render(<ClaimsListHeader onCreateClaim={onCreateClaim} />)

    fireEvent.click(screen.getByRole('button', { name: 'Nuevo reclamo' }))
    expect(onCreateClaim).toHaveBeenCalledTimes(1)
  })

  it('uses non-sticky header mode for list routes', () => {
    const { container } = render(<ClaimsListHeader onCreateClaim={vi.fn()} />)
    const pageHeader = container.querySelector('[data-slot="page-header"]')

    expect(pageHeader?.className).toContain('static')
    expect(pageHeader?.className).not.toContain('sticky top-0')
  })

  it('renders custom title and subtitle when provided', () => {
    render(
      <ClaimsListHeader
        onCreateClaim={vi.fn()}
        title="Reclamos pendientes"
        subtitle="Solo reclamos no terminales"
      />,
    )

    expect(screen.queryByText('Reclamos pendientes')).not.toBeNull()
    expect(screen.queryByText('Solo reclamos no terminales')).not.toBeNull()
  })
})
