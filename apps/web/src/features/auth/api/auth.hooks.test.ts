import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  authQueryOptions,
  fetchFreshAuthUser,
  ensureAuthUser,
  verifyEmailQueryOptions,
} from '@/features/auth/api/auth.hooks'
import { ERROR_CODES } from '@friendly-system/shared'

const meMock = vi.hoisted(() => vi.fn())
const verifyEmailMock = vi.hoisted(() => vi.fn())

vi.mock('@/features/auth/api/auth.api', () => ({
  authApi: {
    me: meMock,
    verifyEmail: verifyEmailMock,
  },
}))

vi.mock('@/shared/lib/api-client', () => ({
  isSessionLossError: (error: unknown) =>
    typeof error === 'object' &&
    error !== null &&
    ((error as { code?: string }).code === 'AUTH_REQUIRED' ||
      (error as { code?: string }).code === 'AUTH_SESSION_INVALID' ||
      (error as { code?: string }).code === 'AUTH_ACCOUNT_DEACTIVATED'),
}))

describe('authQueryOptions', () => {
  beforeEach(() => {
    meMock.mockReset()
    verifyEmailMock.mockReset()
  })

  const runAuthQuery = () =>
    (authQueryOptions.queryFn as () => Promise<unknown>)()

  it('returns null when /me responds with session-loss error', async () => {
    meMock.mockRejectedValueOnce({ code: ERROR_CODES.AUTH_SESSION_INVALID })

    await expect(runAuthQuery()).resolves.toBeNull()
  })

  it('rethrows non-session auth errors from /me', async () => {
    const error = { code: ERROR_CODES.AUTH_INVALID_CREDENTIALS }
    meMock.mockRejectedValueOnce(error)

    await expect(runAuthQuery()).rejects.toBe(error)
  })

  it('fetchFreshAuthUser enforces staleTime 0', async () => {
    const fetchQueryMock = vi.fn().mockResolvedValue(null)
    const queryClient = {
      fetchQuery: fetchQueryMock,
    } as unknown as Parameters<typeof fetchFreshAuthUser>[0]

    await fetchFreshAuthUser(queryClient)

    expect(fetchQueryMock).toHaveBeenCalledTimes(1)
    expect(fetchQueryMock).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: authQueryOptions.queryKey,
        staleTime: 0,
      }),
    )
  })

  it('ensureAuthUser delegates to ensureQueryData', async () => {
    const ensureQueryDataMock = vi.fn().mockResolvedValue(null)
    const queryClient = {
      ensureQueryData: ensureQueryDataMock,
    } as unknown as Parameters<typeof ensureAuthUser>[0]

    await ensureAuthUser(queryClient)

    expect(ensureQueryDataMock).toHaveBeenCalledTimes(1)
    expect(ensureQueryDataMock).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: authQueryOptions.queryKey,
      }),
    )
  })

  it('verifyEmailQueryOptions configures a single-flight verification query', async () => {
    const token = 'token-123'
    const response = { message: 'Correo verificado' }
    verifyEmailMock.mockResolvedValueOnce(response)

    const options = verifyEmailQueryOptions(token)

    expect(options.queryKey).toEqual(['auth', 'verify-email', token])
    expect(options.enabled).toBe(true)
    expect(options.retry).toBe(false)
    expect(options.staleTime).toBe(Infinity)
    expect(options.refetchOnWindowFocus).toBe(false)
    expect(options.refetchOnReconnect).toBe(false)
    expect(options.refetchOnMount).toBe(false)
    await expect(
      (options.queryFn as () => Promise<unknown>)(),
    ).resolves.toEqual(response)
    expect(verifyEmailMock).toHaveBeenCalledWith({ token })
  })

  it('verifyEmailQueryOptions disables fetching when token is missing', () => {
    const options = verifyEmailQueryOptions('')
    expect(options.enabled).toBe(false)
  })
})
