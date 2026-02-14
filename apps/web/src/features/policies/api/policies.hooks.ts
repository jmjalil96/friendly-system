import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import type {
  CreatePolicyInput,
  ListPoliciesQuery,
  TransitionPolicyInput,
  UpdatePolicyInput,
} from '@friendly-system/shared'
import { policiesApi } from './policies.api'
import {
  POLICIES_LIST_QUERY_KEY,
  POLICIES_QUERY_KEY,
} from './policies.query-keys'
import { DEFAULT_POLICIES_LIST_SEARCH } from '@/features/policies/model/policies.search'
import {
  listPoliciesQueryOptions,
  lookupPolicyClientsQueryOptions,
  lookupPolicyInsurersQueryOptions,
  policyByIdQueryOptions,
  policyHistoryQueryOptions,
  policyTimelineQueryOptions,
} from './policies.query-options'

export {
  listPoliciesQueryOptions,
  lookupPolicyClientsQueryOptions,
  lookupPolicyInsurersQueryOptions,
  policyByIdQueryOptions,
  policyHistoryQueryOptions,
  policyTimelineQueryOptions,
}

export function useListPolicies(filters: Partial<ListPoliciesQuery> = {}) {
  return useQuery(listPoliciesQueryOptions(filters))
}

export function usePolicyById(id: string) {
  return useQuery(policyByIdQueryOptions(id))
}

export function useLookupPolicyClients(query: Record<string, unknown> = {}) {
  return useQuery(lookupPolicyClientsQueryOptions(query))
}

export function useLookupPolicyInsurers(query: Record<string, unknown> = {}) {
  return useQuery(lookupPolicyInsurersQueryOptions(query))
}

export function usePolicyHistory(
  id: string,
  query: Record<string, unknown> = {},
) {
  return useQuery(policyHistoryQueryOptions(id, query))
}

export function usePolicyTimeline(
  id: string,
  query: Record<string, unknown> = {},
) {
  return useQuery(policyTimelineQueryOptions(id, query))
}

export function useCreatePolicy() {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: (input: CreatePolicyInput) => policiesApi.create(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: POLICIES_LIST_QUERY_KEY })
    },
  })

  return {
    createPolicy: mutation.mutateAsync,
    createPolicyStatus: mutation.status,
  }
}

export function useUpdatePolicy(id: string) {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: (input: UpdatePolicyInput) => policiesApi.update(id, input),
    onSuccess: (data) => {
      queryClient.setQueryData([...POLICIES_QUERY_KEY, id], data)
      void queryClient.invalidateQueries({ queryKey: POLICIES_LIST_QUERY_KEY })
      void queryClient.invalidateQueries({
        queryKey: [...POLICIES_QUERY_KEY, id, 'timeline'],
      })
    },
  })

  return {
    updatePolicy: mutation.mutateAsync,
    updatePolicyStatus: mutation.status,
  }
}

export function useTransitionPolicy(id: string) {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: (input: TransitionPolicyInput) =>
      policiesApi.transition(id, input),
    onSuccess: (data) => {
      queryClient.setQueryData([...POLICIES_QUERY_KEY, id], data)
      void queryClient.invalidateQueries({ queryKey: POLICIES_LIST_QUERY_KEY })
      void queryClient.invalidateQueries({
        queryKey: [...POLICIES_QUERY_KEY, id, 'history'],
      })
      void queryClient.invalidateQueries({
        queryKey: [...POLICIES_QUERY_KEY, id, 'timeline'],
      })
    },
  })

  return {
    transitionPolicy: mutation.mutateAsync,
    transitionPolicyStatus: mutation.status,
  }
}

export function useDeletePolicy() {
  const queryClient = useQueryClient()
  const router = useRouter()

  const mutation = useMutation({
    mutationFn: (id: string) => policiesApi.delete(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: POLICIES_LIST_QUERY_KEY })
      void router.navigate({
        to: '/polizas',
        search: DEFAULT_POLICIES_LIST_SEARCH,
        replace: true,
      })
    },
  })

  return {
    deletePolicy: mutation.mutateAsync,
    deletePolicyStatus: mutation.status,
  }
}
