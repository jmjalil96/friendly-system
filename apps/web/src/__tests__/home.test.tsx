// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import {
  createRouter,
  createRootRoute,
  createRoute,
  RouterProvider,
  createMemoryHistory,
} from '@tanstack/react-router'

const rootRoute = createRootRoute()

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: () => (
    <div className="flex min-h-screen items-center justify-center">
      <h1 className="text-4xl font-bold">friendly-system</h1>
    </div>
  ),
})

const routeTree = rootRoute.addChildren([indexRoute])

function renderWithRouter() {
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: ['/'] }),
  })
  return render(<RouterProvider router={router} />)
}

describe('Home page', () => {
  it('renders heading', async () => {
    renderWithRouter()
    expect(await screen.findByText('friendly-system')).toBeDefined()
  })
})
