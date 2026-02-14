import { api } from '@/shared/lib/api-client'
import { API_ROUTES } from '@friendly-system/shared'
import type {
  CreatePolicyInput,
  CreatePolicyResponse,
  DeletePolicyResponse,
  GetPolicyByIdResponse,
  ListPoliciesResponse,
  LookupPolicyClientsResponse,
  LookupPolicyInsurersResponse,
  PolicyHistoryResponse,
  PolicyTimelineResponse,
  TransitionPolicyInput,
  UpdatePolicyInput,
} from '@friendly-system/shared'

function buildQuery(params: Record<string, unknown>): string {
  const entries = Object.entries(params).filter(
    ([, value]) => value !== undefined && value !== null && value !== '',
  )

  if (entries.length === 0) return ''

  const search = new URLSearchParams()
  for (const [key, value] of entries) {
    if (Array.isArray(value)) {
      for (const item of value) search.append(key, String(item))
    } else {
      search.set(key, String(value))
    }
  }

  return `?${search.toString()}`
}

function route(template: string, params: Record<string, string>): string {
  let path = template
  for (const [key, value] of Object.entries(params)) {
    path = path.replace(`:${key}`, value)
  }
  return path
}

export const policiesApi = {
  create: (input: CreatePolicyInput) =>
    api.post<CreatePolicyResponse>(API_ROUTES.policies.create, input),

  list: (query: Record<string, unknown> = {}) =>
    api.get<ListPoliciesResponse>(
      `${API_ROUTES.policies.list}${buildQuery(query)}`,
    ),

  getById: (id: string) =>
    api.get<GetPolicyByIdResponse>(route(API_ROUTES.policies.getById, { id })),

  update: (id: string, input: UpdatePolicyInput) =>
    api.patch<GetPolicyByIdResponse>(
      route(API_ROUTES.policies.update, { id }),
      input,
    ),

  transition: (id: string, input: TransitionPolicyInput) =>
    api.post<GetPolicyByIdResponse>(
      route(API_ROUTES.policies.transition, { id }),
      input,
    ),

  delete: (id: string) =>
    api.delete<DeletePolicyResponse>(route(API_ROUTES.policies.delete, { id })),

  lookupClients: (query: Record<string, unknown> = {}) =>
    api.get<LookupPolicyClientsResponse>(
      `${API_ROUTES.policies.lookupClients}${buildQuery(query)}`,
    ),

  lookupInsurers: (query: Record<string, unknown> = {}) =>
    api.get<LookupPolicyInsurersResponse>(
      `${API_ROUTES.policies.lookupInsurers}${buildQuery(query)}`,
    ),

  history: (id: string, query: Record<string, unknown> = {}) =>
    api.get<PolicyHistoryResponse>(
      `${route(API_ROUTES.policies.history, { id })}${buildQuery(query)}`,
    ),

  timeline: (id: string, query: Record<string, unknown> = {}) =>
    api.get<PolicyTimelineResponse>(
      `${route(API_ROUTES.policies.timeline, { id })}${buildQuery(query)}`,
    ),
}
