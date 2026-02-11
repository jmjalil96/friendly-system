// @vitest-environment jsdom
import type { ComponentType } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'

const navigateMock = vi.hoisted(() => vi.fn())
const useNewClaimFormMock = vi.hoisted(() => vi.fn())
const handleSubmitMock = vi.hoisted(() => vi.fn())
const formState = vi.hoisted(() => ({
  canSubmit: true,
  isSubmitting: false,
  dataCardProps: {},
  descriptionCardProps: {},
}))

vi.mock('@tanstack/react-router', async () => {
  const actual = await vi.importActual<typeof import('@tanstack/react-router')>(
    '@tanstack/react-router',
  )

  return {
    ...actual,
    useRouter: () => ({
      navigate: navigateMock,
    }),
  }
})

vi.mock('@/features/claims/hooks/use-new-claim-form', () => ({
  useNewClaimForm: useNewClaimFormMock,
}))

vi.mock('@/features/claims/components/new/claim-data-card', () => ({
  ClaimDataCard: () => <div>Mock Data Card</div>,
}))

vi.mock('@/features/claims/components/new/claim-description-card', () => ({
  ClaimDescriptionCard: () => <div>Mock Description Card</div>,
}))

vi.mock('@/features/claims/components/new/claim-documents-card', () => ({
  ClaimDocumentsCard: () => <div>Mock Documents Card</div>,
}))

vi.mock('@/features/claims/components/new/claim-tips-card', () => ({
  ClaimTipsCard: () => <div>Mock Tips Card</div>,
}))

vi.mock(
  '@/features/claims/components/new/submit-claim-confirm-dialog',
  () => ({
    SubmitClaimConfirmDialog: ({
      open,
      onConfirm,
      onOpenChange,
      canSubmit,
      isSubmitting,
    }: {
      open: boolean
      onConfirm: () => void | Promise<void>
      onOpenChange: (open: boolean) => void
      canSubmit: boolean
      isSubmitting: boolean
    }) =>
      open ? (
        <div>
          <p>Mock Confirm Dialog</p>
          <button
            type="button"
            disabled={!canSubmit || isSubmitting}
            onClick={() => void onConfirm()}
          >
            confirm-submit
          </button>
          <button type="button" onClick={() => onOpenChange(false)}>
            request-close
          </button>
        </div>
      ) : null,
  }),
)

import { Route } from '@/routes/_authenticated/reclamos/nuevo'

function renderPage() {
  const Component = Route.options.component as ComponentType
  return render(<Component />)
}

describe('reclamos nuevo route', () => {
  beforeEach(() => {
    navigateMock.mockReset()
    navigateMock.mockResolvedValue(undefined)
    handleSubmitMock.mockReset()
    handleSubmitMock.mockResolvedValue(undefined)
    formState.canSubmit = true
    formState.isSubmitting = false

    useNewClaimFormMock.mockImplementation(() => ({
      ...formState,
      handleSubmit: handleSubmitMock,
    }))
  })

  afterEach(() => {
    cleanup()
  })

  it('opens confirm modal on submit click without immediate submit', () => {
    renderPage()

    fireEvent.click(screen.getByRole('button', { name: 'Crear reclamo' }))

    expect(screen.queryByText('Mock Confirm Dialog')).not.toBeNull()
    expect(handleSubmitMock).not.toHaveBeenCalled()
  })

  it('submits when modal confirm action is clicked', async () => {
    renderPage()

    fireEvent.click(screen.getByRole('button', { name: 'Crear reclamo' }))
    fireEvent.click(screen.getByRole('button', { name: 'confirm-submit' }))

    await waitFor(() => {
      expect(handleSubmitMock).toHaveBeenCalledTimes(1)
    })
  })

  it('keeps submit button disabled when form cannot submit', () => {
    formState.canSubmit = false
    renderPage()

    const submitButton = screen.getByRole('button', {
      name: 'Crear reclamo',
    }) as HTMLButtonElement

    expect(submitButton.disabled).toBe(true)
    fireEvent.click(submitButton)
    expect(screen.queryByText('Mock Confirm Dialog')).toBeNull()
  })

  it('blocks modal close requests while submitting', () => {
    const { rerender } = renderPage()

    fireEvent.click(screen.getByRole('button', { name: 'Crear reclamo' }))
    expect(screen.queryByText('Mock Confirm Dialog')).not.toBeNull()

    formState.isSubmitting = true
    const Component = Route.options.component as ComponentType
    rerender(<Component />)

    fireEvent.click(screen.getByRole('button', { name: 'request-close' }))

    expect(screen.queryByText('Mock Confirm Dialog')).not.toBeNull()
  })
})
