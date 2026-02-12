import { queryOptions, type QueryClient } from '@tanstack/react-query'
import { isSessionLossError } from '@/shared/lib/api-client'
import { authApi } from './auth.api'
import { AUTH_QUERY_KEY, VERIFY_EMAIL_QUERY_KEY } from './auth.query-keys'

const AUTH_STALE_TIME_MS = 60 * 1000

export const authQueryOptions = queryOptions({
  queryKey: AUTH_QUERY_KEY,
  queryFn: async () => {
    try {
      return await authApi.me()
    } catch (error) {
      if (isSessionLossError(error)) {
        return null
      }
      throw error
    }
  },
  retry: false,
  staleTime: AUTH_STALE_TIME_MS,
  refetchOnWindowFocus: true,
  refetchOnReconnect: true,
})

export function verifyEmailQueryOptions(token: string) {
  return queryOptions({
    queryKey: [...VERIFY_EMAIL_QUERY_KEY, token] as const,
    queryFn: () => authApi.verifyEmail({ token }),
    enabled: Boolean(token),
    retry: false,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
  })
}

export function fetchFreshAuthUser(queryClient: QueryClient) {
  return queryClient.fetchQuery({
    ...authQueryOptions,
    staleTime: 0,
  })
}

export function ensureAuthUser(queryClient: QueryClient) {
  return queryClient.ensureQueryData(authQueryOptions)
}
