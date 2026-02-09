import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ERROR_CODES } from '@friendly-system/shared'
import { api, onUnauthorized } from '@/lib/api'

const toastErrorMock = vi.hoisted(() => vi.fn())

vi.mock('@/hooks/use-toast', () => ({
  toast: {
    error: toastErrorMock,
  },
}))

function mockFetchResponse(response: Partial<Response>) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response as Response))
}

describe('api request auth/error handling', () => {
  const unauthorizedMock = vi.fn()

  beforeEach(() => {
    toastErrorMock.mockReset()
    unauthorizedMock.mockReset()
    onUnauthorized(unauthorizedMock)
  })

  it('invokes unauthorized handler for AUTH_REQUIRED', async () => {
    mockFetchResponse({
      ok: false,
      status: 401,
      json: async () => ({
        error: {
          message: 'Authentication required',
          statusCode: 401,
          code: ERROR_CODES.AUTH_REQUIRED,
        },
      }),
    })

    await expect(api.get('/auth/me')).rejects.toMatchObject({
      statusCode: 401,
      code: ERROR_CODES.AUTH_REQUIRED,
    })
    expect(unauthorizedMock).toHaveBeenCalledTimes(1)
    expect(toastErrorMock).not.toHaveBeenCalled()
  })

  it('does not invoke unauthorized handler for AUTH_INVALID_CREDENTIALS', async () => {
    mockFetchResponse({
      ok: false,
      status: 401,
      json: async () => ({
        error: {
          message: 'Invalid email or password',
          statusCode: 401,
          code: ERROR_CODES.AUTH_INVALID_CREDENTIALS,
        },
      }),
    })

    await expect(api.post('/auth/login', {})).rejects.toMatchObject({
      statusCode: 401,
      code: ERROR_CODES.AUTH_INVALID_CREDENTIALS,
    })
    expect(unauthorizedMock).not.toHaveBeenCalled()
    expect(toastErrorMock).toHaveBeenCalledTimes(1)
  })

  it('does not invoke unauthorized handler for AUTH_EMAIL_NOT_VERIFIED', async () => {
    mockFetchResponse({
      ok: false,
      status: 403,
      json: async () => ({
        error: {
          message: 'Email not verified',
          statusCode: 403,
          code: ERROR_CODES.AUTH_EMAIL_NOT_VERIFIED,
        },
      }),
    })

    await expect(api.post('/auth/login', {})).rejects.toMatchObject({
      statusCode: 403,
      code: ERROR_CODES.AUTH_EMAIL_NOT_VERIFIED,
    })
    expect(unauthorizedMock).not.toHaveBeenCalled()
    expect(toastErrorMock).toHaveBeenCalledTimes(1)
  })

  it('uses code=null on malformed 401 error body and avoids auth clear', async () => {
    mockFetchResponse({
      ok: false,
      status: 401,
      json: async () => {
        throw new Error('malformed body')
      },
    })

    await expect(api.post('/auth/logout', {})).rejects.toMatchObject({
      statusCode: 401,
      code: null,
    })
    expect(unauthorizedMock).not.toHaveBeenCalled()
    expect(toastErrorMock).toHaveBeenCalledTimes(1)
  })

  it('toasts and throws code-preserving ApiError for non-401 responses', async () => {
    mockFetchResponse({
      ok: false,
      status: 409,
      json: async () => ({
        error: {
          message: 'Email or organization name unavailable',
          statusCode: 409,
          code: ERROR_CODES.AUTH_IDENTITY_UNAVAILABLE,
        },
      }),
    })

    await expect(api.post('/auth/register', {})).rejects.toMatchObject({
      statusCode: 409,
      code: ERROR_CODES.AUTH_IDENTITY_UNAVAILABLE,
    })
    expect(unauthorizedMock).not.toHaveBeenCalled()
    expect(toastErrorMock).toHaveBeenCalledTimes(1)
  })
})
