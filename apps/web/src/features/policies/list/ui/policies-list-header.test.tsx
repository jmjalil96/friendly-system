// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { PoliciesListHeader } from '@/features/policies/list/ui/policies-list-header'

describe('PoliciesListHeader', () => {
  afterEach(() => {
    cleanup()
  })

  it('forwards custom className to shared page header root', () => {
    const { container } = render(
      <PoliciesListHeader
        onCreatePolicy={vi.fn()}
        className="static z-auto shadow-none"
      />,
    )

    const pageHeader = container.querySelector('[data-slot="page-header"]')
    expect(pageHeader?.className).toContain('static')
    expect(pageHeader?.className).toContain('shadow-none')
  })

  it('invokes create action from header CTA', () => {
    const onCreatePolicy = vi.fn()

    render(<PoliciesListHeader onCreatePolicy={onCreatePolicy} />)

    fireEvent.click(screen.getByRole('button', { name: 'Nueva póliza' }))
    expect(onCreatePolicy).toHaveBeenCalledTimes(1)
  })

  it('uses non-sticky header mode for list routes', () => {
    const { container } = render(
      <PoliciesListHeader onCreatePolicy={vi.fn()} />,
    )
    const pageHeader = container.querySelector('[data-slot="page-header"]')

    expect(pageHeader?.className).toContain('static')
    expect(pageHeader?.className).not.toContain('sticky top-0')
  })
})
