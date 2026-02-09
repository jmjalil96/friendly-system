import { api } from '../../lib/api'
import type {
  ForgotPasswordInput,
  ForgotPasswordResponse,
  LoginInput,
  LoginResponse,
  MeResponse,
  RegisterInput,
  RegisterResponse,
  ResetPasswordInput,
  ResendVerificationInput,
  VerifyEmailInput,
} from '@friendly-system/shared'
import { API_ROUTES } from '@friendly-system/shared'

export const authApi = {
  me: () => api.get<MeResponse>(API_ROUTES.auth.me),
  login: (input: LoginInput) =>
    api.post<LoginResponse>(API_ROUTES.auth.login, input),
  register: (input: RegisterInput) =>
    api.post<RegisterResponse>(API_ROUTES.auth.register, input),
  logout: () => api.post<{ message: string }>(API_ROUTES.auth.logout, {}),
  verifyEmail: (input: VerifyEmailInput) =>
    api.post<{ message: string }>(API_ROUTES.auth.verifyEmail, input),
  resendVerification: (input: ResendVerificationInput) =>
    api.post<{ message: string }>(
      API_ROUTES.auth.resendVerification,
      input,
    ),
  forgotPassword: (input: ForgotPasswordInput) =>
    api.post<ForgotPasswordResponse>(API_ROUTES.auth.forgotPassword, input),
  resetPassword: (input: ResetPasswordInput) =>
    api.post<{ message: string }>(API_ROUTES.auth.resetPassword, input),
}
