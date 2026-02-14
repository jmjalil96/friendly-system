import { api } from '@/shared/lib/api-client'
import { API_ROUTES } from '@friendly-system/shared'
import type {
  CreateInsurerInput,
  CreateInsurerResponse,
  DeleteInsurerResponse,
  GetInsurerByIdResponse,
  InsurerTimelineResponse,
  ListInsurersResponse,
  UpdateInsurerInput,
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

export const insurersApi = {
  create: (input: CreateInsurerInput) =>
    api.post<CreateInsurerResponse>(API_ROUTES.insurers.create, input),

  list: (query: Record<string, unknown> = {}) =>
    api.get<ListInsurersResponse>(
      `${API_ROUTES.insurers.list}${buildQuery(query)}`,
    ),

  getById: (id: string) =>
    api.get<GetInsurerByIdResponse>(route(API_ROUTES.insurers.getById, { id })),

  update: (id: string, input: UpdateInsurerInput) =>
    api.patch<GetInsurerByIdResponse>(
      route(API_ROUTES.insurers.update, { id }),
      input,
    ),

  deactivate: (id: string) =>
    api.delete<DeleteInsurerResponse>(
      route(API_ROUTES.insurers.delete, { id }),
    ),

  timeline: (id: string, query: Record<string, unknown> = {}) =>
    api.get<InsurerTimelineResponse>(
      `${route(API_ROUTES.insurers.timeline, { id })}${buildQuery(query)}`,
    ),
}
