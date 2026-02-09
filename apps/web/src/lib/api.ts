import { toast } from '@/hooks/use-toast'
import {
  ERROR_CODES,
  errorResponseSchema,
  type ErrorCode,
} from '@friendly-system/shared'

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code: ErrorCode | null,
  ) {
    super(message)
  }
}

function isSessionLossCode(code: ErrorCode | null): boolean {
  return (
    code === ERROR_CODES.AUTH_REQUIRED ||
    code === ERROR_CODES.AUTH_SESSION_INVALID ||
    code === ERROR_CODES.AUTH_ACCOUNT_DEACTIVATED
  )
}

export function isSessionLossError(error: unknown): error is ApiError {
  return error instanceof ApiError && isSessionLossCode(error.code)
}

let unauthorizedHandler: (() => void) | null = null

export function onUnauthorized(handler: () => void) {
  unauthorizedHandler = handler
}

const BASE_URL = import.meta.env.VITE_API_URL ?? '/api'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  let res: Response

  try {
    res = await fetch(`${BASE_URL}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      ...options,
    })
  } catch {
    toast.error('Error de conexión', {
      description: 'Verifica tu conexión a internet',
    })
    throw new ApiError(0, 'Network error', null)
  }

  if (!res.ok) {
    const body = await res.json().catch(() => null)
    const parsed = errorResponseSchema.safeParse(body)
    const message = parsed.success
      ? parsed.data.error.message
      : `Request failed: ${res.status}`
    const code = parsed.success ? parsed.data.error.code : null
    const error = new ApiError(res.status, message, code)

    if (isSessionLossCode(code)) {
      unauthorizedHandler?.()
    }

    if (!isSessionLossCode(code)) {
      toast.error(message)
    }

    throw error
  }

  return res.json() as Promise<T>
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
}
