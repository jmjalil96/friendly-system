import { api } from '@/shared/lib/api-client'
import { API_ROUTES } from '@friendly-system/shared'
import type {
  CreateClaimInput,
  CreateClaimResponse,
  GetClaimByIdResponse,
  ListClaimsResponse,
  UpdateClaimInput,
  TransitionClaimInput,
  DeleteClaimResponse,
  LookupClientsResponse,
  LookupClientAffiliatesResponse,
  LookupAffiliatePatientsResponse,
  LookupClientPoliciesResponse,
  ClaimHistoryResponse,
  ClaimTimelineResponse,
  ClaimInvoicesResponse,
  ClaimInvoiceResponse,
  CreateClaimInvoiceInput,
  UpdateClaimInvoiceInput,
  DeleteClaimInvoiceResponse,
} from '@friendly-system/shared'

function buildQuery(params: Record<string, unknown>): string {
  const entries = Object.entries(params).filter(
    ([, v]) => v !== undefined && v !== null && v !== '',
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

export const claimsApi = {
  // ── CRUD ──────────────────────────────────────────────────────────
  create: (input: CreateClaimInput) =>
    api.post<CreateClaimResponse>(API_ROUTES.claims.create, input),

  list: (query: Record<string, unknown> = {}) =>
    api.get<ListClaimsResponse>(
      `${API_ROUTES.claims.list}${buildQuery(query)}`,
    ),

  getById: (id: string) =>
    api.get<GetClaimByIdResponse>(route(API_ROUTES.claims.getById, { id })),

  update: (id: string, input: UpdateClaimInput) =>
    api.patch<GetClaimByIdResponse>(
      route(API_ROUTES.claims.update, { id }),
      input,
    ),

  transition: (id: string, input: TransitionClaimInput) =>
    api.post<GetClaimByIdResponse>(
      route(API_ROUTES.claims.transition, { id }),
      input,
    ),

  delete: (id: string) =>
    api.delete<DeleteClaimResponse>(route(API_ROUTES.claims.delete, { id })),

  // ── Lookups ───────────────────────────────────────────────────────
  lookupClients: (query: Record<string, unknown> = {}) =>
    api.get<LookupClientsResponse>(
      `${API_ROUTES.claims.lookupClients}${buildQuery(query)}`,
    ),

  lookupClientAffiliates: (
    clientId: string,
    query: Record<string, unknown> = {},
  ) =>
    api.get<LookupClientAffiliatesResponse>(
      `${route(API_ROUTES.claims.lookupClientAffiliates, { clientId })}${buildQuery(query)}`,
    ),

  lookupAffiliatePatients: (affiliateId: string) =>
    api.get<LookupAffiliatePatientsResponse>(
      route(API_ROUTES.claims.lookupAffiliatePatients, { affiliateId }),
    ),

  lookupClientPolicies: (
    clientId: string,
    query: Record<string, unknown> = {},
  ) =>
    api.get<LookupClientPoliciesResponse>(
      `${route(API_ROUTES.claims.lookupClientPolicies, { clientId })}${buildQuery(query)}`,
    ),

  // ── History & Timeline ────────────────────────────────────────────
  history: (id: string, query: Record<string, unknown> = {}) =>
    api.get<ClaimHistoryResponse>(
      `${route(API_ROUTES.claims.history, { id })}${buildQuery(query)}`,
    ),

  timeline: (id: string, query: Record<string, unknown> = {}) =>
    api.get<ClaimTimelineResponse>(
      `${route(API_ROUTES.claims.timeline, { id })}${buildQuery(query)}`,
    ),

  // ── Invoices ──────────────────────────────────────────────────────
  listInvoices: (id: string, query: Record<string, unknown> = {}) =>
    api.get<ClaimInvoicesResponse>(
      `${route(API_ROUTES.claims.invoices, { id })}${buildQuery(query)}`,
    ),

  createInvoice: (id: string, input: CreateClaimInvoiceInput) =>
    api.post<ClaimInvoiceResponse>(
      route(API_ROUTES.claims.invoices, { id }),
      input,
    ),

  updateInvoice: (
    id: string,
    invoiceId: string,
    input: UpdateClaimInvoiceInput,
  ) =>
    api.patch<ClaimInvoiceResponse>(
      route(API_ROUTES.claims.invoiceById, { id, invoiceId }),
      input,
    ),

  deleteInvoice: (id: string, invoiceId: string) =>
    api.delete<DeleteClaimInvoiceResponse>(
      route(API_ROUTES.claims.invoiceById, { id, invoiceId }),
    ),
}
