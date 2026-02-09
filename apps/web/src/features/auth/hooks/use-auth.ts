import {
  queryOptions,
  type QueryClient,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { isSessionLossError } from '../../../lib/api'
import { AUTH_QUERY_KEY, VERIFY_EMAIL_QUERY_KEY } from '../auth-query'
import { authApi } from '../api'

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

export function fetchFreshAuthUser(queryClient: QueryClient) {
  return queryClient.fetchQuery({
    ...authQueryOptions,
    staleTime: 0,
  })
}

export function ensureAuthUser(queryClient: QueryClient) {
  return queryClient.ensureQueryData(authQueryOptions)
}

export function useAuthUser() {
  const { data, isLoading, isFetching, error } = useQuery(authQueryOptions)

  return {
    user: data ?? null,
    isLoading,
    isFetching,
    isAuthenticated: !!data,
    error,
  }
}

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

export function useVerifyEmail(token: string) {
  return useQuery(verifyEmailQueryOptions(token))
}

export function useLogin() {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: (data) => {
      queryClient.setQueryData(authQueryOptions.queryKey, data)
    },
  })

  return {
    login: mutation.mutateAsync,
    loginStatus: mutation.status,
  }
}

export function useRegister() {
  const mutation = useMutation({
    mutationFn: authApi.register,
  })

  return {
    register: mutation.mutateAsync,
    registerStatus: mutation.status,
  }
}

export function useForgotPassword() {
  const mutation = useMutation({
    mutationFn: authApi.forgotPassword,
  })

  return {
    forgotPassword: mutation.mutateAsync,
    forgotPasswordStatus: mutation.status,
  }
}

export function useResetPassword() {
  const mutation = useMutation({
    mutationFn: authApi.resetPassword,
  })

  return {
    resetPassword: mutation.mutateAsync,
    resetPasswordStatus: mutation.status,
  }
}

export function useResendVerification() {
  const mutation = useMutation({
    mutationFn: authApi.resendVerification,
  })

  return {
    resendVerification: mutation.mutateAsync,
    resendVerificationStatus: mutation.status,
  }
}

export function useLogout() {
  const queryClient = useQueryClient()
  const router = useRouter()

  const mutation = useMutation({
    mutationFn: async () => {
      try {
        await authApi.logout()
      } catch (error) {
        if (!isSessionLossError(error)) throw error
      }
    },
    onSettled: () => {
      queryClient.setQueryData(authQueryOptions.queryKey, null)
      void router.navigate({ to: '/login', replace: true })
    },
  })

  return {
    logout: mutation.mutateAsync,
    logoutStatus: mutation.status,
  }
}

export function useAuth() {
  const auth = useAuthUser()
  const login = useLogin()
  const register = useRegister()
  const logout = useLogout()

  return {
    ...auth,
    ...login,
    ...register,
    ...logout,
  }
}
