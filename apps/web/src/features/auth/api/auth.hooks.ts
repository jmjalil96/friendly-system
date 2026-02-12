import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { isSessionLossError } from '@/shared/lib/api-client'
import { authApi } from './auth.api'
import { authQueryOptions, verifyEmailQueryOptions } from './auth.query-options'

export {
  authQueryOptions,
  ensureAuthUser,
  fetchFreshAuthUser,
  verifyEmailQueryOptions,
} from './auth.query-options'

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
