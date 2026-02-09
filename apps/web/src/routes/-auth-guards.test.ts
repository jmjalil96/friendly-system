import { beforeEach, describe, expect, it, vi } from 'vitest'
import { isRedirect } from '@tanstack/react-router'

const fetchFreshAuthUserMock = vi.hoisted(() => vi.fn())
const ensureAuthUserMock = vi.hoisted(() => vi.fn())

vi.mock('../features/auth/hooks/use-auth', () => ({
  fetchFreshAuthUser: fetchFreshAuthUserMock,
  ensureAuthUser: ensureAuthUserMock,
}))

import { Route as AuthenticatedRoute } from './_authenticated'
import { Route as GuestRoute } from './_guest'

type RedirectOptionsError = {
  options?: {
    to?: string
    replace?: boolean
  }
}

async function runGuardBeforeLoad(route: unknown, queryClient: unknown) {
  const beforeLoad = (
    route as {
      options?: {
        beforeLoad?: (ctx: { context: { queryClient: unknown } }) => unknown
      }
    }
  )?.options?.beforeLoad as
    | ((ctx: { context: { queryClient: unknown } }) => unknown)
    | undefined

  if (!beforeLoad) {
    throw new Error('Missing beforeLoad guard')
  }

  return beforeLoad({ context: { queryClient } } as never)
}

describe('auth route guards', () => {
  beforeEach(() => {
    fetchFreshAuthUserMock.mockReset()
    ensureAuthUserMock.mockReset()
  })

  it('redirects authenticated layout to /login when no user', async () => {
    const queryClient = { id: 'query-client' }
    fetchFreshAuthUserMock.mockResolvedValueOnce(null)

    try {
      await runGuardBeforeLoad(AuthenticatedRoute, queryClient)
      throw new Error('Expected redirect')
    } catch (error) {
      expect(fetchFreshAuthUserMock).toHaveBeenCalledWith(queryClient)
      expect(isRedirect(error)).toBe(true)

      if (!isRedirect(error)) {
        return
      }

      const redirectError = error as RedirectOptionsError
      expect(redirectError.options?.to).toBe('/login')
      expect(redirectError.options?.replace).toBe(true)
    }
  })

  it('allows authenticated layout when user exists', async () => {
    const queryClient = { id: 'query-client' }
    fetchFreshAuthUserMock.mockResolvedValueOnce({ id: 'user-1' })

    await expect(
      runGuardBeforeLoad(AuthenticatedRoute, queryClient),
    ).resolves.toBeUndefined()
    expect(fetchFreshAuthUserMock).toHaveBeenCalledWith(queryClient)
  })

  it('propagates guard fetch errors in authenticated layout', async () => {
    const queryClient = { id: 'query-client' }
    const error = new Error('guard fetch failed')
    fetchFreshAuthUserMock.mockRejectedValueOnce(error)

    await expect(
      runGuardBeforeLoad(AuthenticatedRoute, queryClient),
    ).rejects.toBe(error)
    expect(fetchFreshAuthUserMock).toHaveBeenCalledWith(queryClient)
  })

  it('redirects guest layout to / when user exists', async () => {
    const queryClient = { id: 'query-client' }
    ensureAuthUserMock.mockResolvedValueOnce({ id: 'user-1' })

    try {
      await runGuardBeforeLoad(GuestRoute, queryClient)
      throw new Error('Expected redirect')
    } catch (error) {
      expect(ensureAuthUserMock).toHaveBeenCalledWith(queryClient)
      expect(isRedirect(error)).toBe(true)

      if (!isRedirect(error)) {
        return
      }

      const redirectError = error as RedirectOptionsError
      expect(redirectError.options?.to).toBe('/')
      expect(redirectError.options?.replace).toBe(true)
    }
  })

  it('allows guest layout when user is not authenticated', async () => {
    const queryClient = { id: 'query-client' }
    ensureAuthUserMock.mockResolvedValueOnce(null)

    await expect(runGuardBeforeLoad(GuestRoute, queryClient)).resolves.toBeUndefined()
    expect(ensureAuthUserMock).toHaveBeenCalledWith(queryClient)
  })
})
