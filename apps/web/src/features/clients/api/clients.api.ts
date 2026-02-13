import { api } from '@/shared/lib/api-client'
import { API_ROUTES } from '@friendly-system/shared'
import type {
  ClientPoliciesResponse,
  ClientTimelineResponse,
  CreateClientInput,
  CreateClientResponse,
  DeleteClientResponse,
  GetClientByIdResponse,
  ListClientsResponse,
  UpdateClientInput,
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

export const clientsApi = {
  create: (input: CreateClientInput) =>
    api.post<CreateClientResponse>(API_ROUTES.clients.create, input),

  list: (query: Record<string, unknown> = {}) =>
    api.get<ListClientsResponse>(
      `${API_ROUTES.clients.list}${buildQuery(query)}`,
    ),

  getById: (id: string) =>
    api.get<GetClientByIdResponse>(route(API_ROUTES.clients.getById, { id })),

  update: (id: string, input: UpdateClientInput) =>
    api.patch<GetClientByIdResponse>(
      route(API_ROUTES.clients.update, { id }),
      input,
    ),

  deactivate: (id: string) =>
    api.delete<DeleteClientResponse>(route(API_ROUTES.clients.delete, { id })),

  timeline: (id: string, query: Record<string, unknown> = {}) =>
    api.get<ClientTimelineResponse>(
      `${route(API_ROUTES.clients.timeline, { id })}${buildQuery(query)}`,
    ),

  policies: (id: string, query: Record<string, unknown> = {}) =>
    api.get<ClientPoliciesResponse>(
      `${route(API_ROUTES.clients.policies, { id })}${buildQuery(query)}`,
    ),
}
