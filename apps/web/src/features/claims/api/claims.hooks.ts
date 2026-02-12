import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import type {
  CreateClaimInput,
  TransitionClaimInput,
  UpdateClaimInput,
  CreateClaimInvoiceInput,
  UpdateClaimInvoiceInput,
  ListClaimsQuery,
} from '@friendly-system/shared'
import { claimsApi } from './claims.api'
import {
  CLAIMS_LIST_QUERY_KEY,
  CLAIMS_QUERY_KEY,
} from './claims.query-keys'
import { DEFAULT_CLAIMS_LIST_SEARCH } from '@/features/claims/model/claims.search'
import {
  claimByIdQueryOptions,
  claimHistoryQueryOptions,
  claimInvoicesQueryOptions,
  claimTimelineQueryOptions,
  listClaimsQueryOptions,
  lookupAffiliatePatientsQueryOptions,
  lookupClientAffiliatesQueryOptions,
  lookupClientPoliciesQueryOptions,
  lookupClientsQueryOptions,
} from './claims.query-options'

export {
  claimByIdQueryOptions,
  claimHistoryQueryOptions,
  claimInvoicesQueryOptions,
  claimTimelineQueryOptions,
  listClaimsQueryOptions,
  lookupAffiliatePatientsQueryOptions,
  lookupClientAffiliatesQueryOptions,
  lookupClientPoliciesQueryOptions,
  lookupClientsQueryOptions,
}

export function useListClaims(filters: Partial<ListClaimsQuery> = {}) {
  return useQuery(listClaimsQueryOptions(filters))
}

export function useClaimById(id: string) {
  return useQuery(claimByIdQueryOptions(id))
}

export function useLookupClients(query: Record<string, unknown> = {}) {
  return useQuery(lookupClientsQueryOptions(query))
}

export function useLookupClientAffiliates(
  clientId: string,
  query: Record<string, unknown> = {},
) {
  return useQuery(lookupClientAffiliatesQueryOptions(clientId, query))
}

export function useLookupAffiliatePatients(affiliateId: string) {
  return useQuery(lookupAffiliatePatientsQueryOptions(affiliateId))
}

export function useLookupClientPolicies(
  clientId: string,
  query: Record<string, unknown> = {},
) {
  return useQuery(lookupClientPoliciesQueryOptions(clientId, query))
}

export function useClaimHistory(
  id: string,
  query: Record<string, unknown> = {},
) {
  return useQuery(claimHistoryQueryOptions(id, query))
}

export function useClaimTimeline(
  id: string,
  query: Record<string, unknown> = {},
) {
  return useQuery(claimTimelineQueryOptions(id, query))
}

export function useClaimInvoices(
  id: string,
  query: Record<string, unknown> = {},
) {
  return useQuery(claimInvoicesQueryOptions(id, query))
}

export function useCreateClaim() {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: (input: CreateClaimInput) => claimsApi.create(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: CLAIMS_LIST_QUERY_KEY })
    },
  })

  return {
    createClaim: mutation.mutateAsync,
    createClaimStatus: mutation.status,
  }
}

export function useUpdateClaim(id: string) {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: (input: UpdateClaimInput) => claimsApi.update(id, input),
    onSuccess: (data) => {
      queryClient.setQueryData([...CLAIMS_QUERY_KEY, id], data)
      void queryClient.invalidateQueries({ queryKey: CLAIMS_LIST_QUERY_KEY })
      void queryClient.invalidateQueries({
        queryKey: [...CLAIMS_QUERY_KEY, id, 'timeline'],
      })
    },
  })

  return {
    updateClaim: mutation.mutateAsync,
    updateClaimStatus: mutation.status,
  }
}

export function useTransitionClaim(id: string) {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: (input: TransitionClaimInput) =>
      claimsApi.transition(id, input),
    onSuccess: (data) => {
      queryClient.setQueryData([...CLAIMS_QUERY_KEY, id], data)
      void queryClient.invalidateQueries({ queryKey: CLAIMS_LIST_QUERY_KEY })
      void queryClient.invalidateQueries({
        queryKey: [...CLAIMS_QUERY_KEY, id, 'history'],
      })
      void queryClient.invalidateQueries({
        queryKey: [...CLAIMS_QUERY_KEY, id, 'timeline'],
      })
    },
  })

  return {
    transitionClaim: mutation.mutateAsync,
    transitionClaimStatus: mutation.status,
  }
}

export function useDeleteClaim() {
  const queryClient = useQueryClient()
  const router = useRouter()

  const mutation = useMutation({
    mutationFn: (id: string) => claimsApi.delete(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: CLAIMS_LIST_QUERY_KEY })
      void router.navigate({
        to: '/reclamos',
        search: DEFAULT_CLAIMS_LIST_SEARCH,
        replace: true,
      })
    },
  })

  return {
    deleteClaim: mutation.mutateAsync,
    deleteClaimStatus: mutation.status,
  }
}

export function useCreateClaimInvoice(claimId: string) {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: (input: CreateClaimInvoiceInput) =>
      claimsApi.createInvoice(claimId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: [...CLAIMS_QUERY_KEY, claimId, 'invoices'],
      })
      void queryClient.invalidateQueries({
        queryKey: [...CLAIMS_QUERY_KEY, claimId, 'timeline'],
      })
    },
  })

  return {
    createInvoice: mutation.mutateAsync,
    createInvoiceStatus: mutation.status,
  }
}

export function useUpdateClaimInvoice(claimId: string) {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: ({
      invoiceId,
      input,
    }: {
      invoiceId: string
      input: UpdateClaimInvoiceInput
    }) => claimsApi.updateInvoice(claimId, invoiceId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: [...CLAIMS_QUERY_KEY, claimId, 'invoices'],
      })
      void queryClient.invalidateQueries({
        queryKey: [...CLAIMS_QUERY_KEY, claimId, 'timeline'],
      })
    },
  })

  return {
    updateInvoice: mutation.mutateAsync,
    updateInvoiceStatus: mutation.status,
  }
}

export function useDeleteClaimInvoice(claimId: string) {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: (invoiceId: string) =>
      claimsApi.deleteInvoice(claimId, invoiceId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: [...CLAIMS_QUERY_KEY, claimId, 'invoices'],
      })
      void queryClient.invalidateQueries({
        queryKey: [...CLAIMS_QUERY_KEY, claimId, 'timeline'],
      })
    },
  })

  return {
    deleteInvoice: mutation.mutateAsync,
    deleteInvoiceStatus: mutation.status,
  }
}
