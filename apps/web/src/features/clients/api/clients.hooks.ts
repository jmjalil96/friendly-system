import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type {
  CreateClientInput,
  ListClientsQuery,
  UpdateClientInput,
} from '@friendly-system/shared'
import { clientsApi } from './clients.api'
import { CLIENTS_LIST_QUERY_KEY, CLIENTS_QUERY_KEY } from './clients.query-keys'
import {
  clientByIdQueryOptions,
  clientPoliciesQueryOptions,
  clientTimelineQueryOptions,
  listClientsQueryOptions,
} from './clients.query-options'

export {
  clientByIdQueryOptions,
  clientPoliciesQueryOptions,
  clientTimelineQueryOptions,
  listClientsQueryOptions,
}

export function useListClients(filters: Partial<ListClientsQuery> = {}) {
  return useQuery(listClientsQueryOptions(filters))
}

export function useClientById(id: string) {
  return useQuery(clientByIdQueryOptions(id))
}

export function useClientTimeline(
  id: string,
  query: Record<string, unknown> = {},
) {
  return useQuery(clientTimelineQueryOptions(id, query))
}

export function useClientPolicies(
  id: string,
  query: Record<string, unknown> = {},
) {
  return useQuery(clientPoliciesQueryOptions(id, query))
}

export function useCreateClient() {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: (input: CreateClientInput) => clientsApi.create(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: CLIENTS_LIST_QUERY_KEY })
    },
  })

  return {
    createClient: mutation.mutateAsync,
    createClientStatus: mutation.status,
  }
}

export function useUpdateClient(id: string) {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: (input: UpdateClientInput) => clientsApi.update(id, input),
    onSuccess: (data) => {
      queryClient.setQueryData([...CLIENTS_QUERY_KEY, id], data)
      void queryClient.invalidateQueries({ queryKey: CLIENTS_LIST_QUERY_KEY })
      void queryClient.invalidateQueries({
        queryKey: [...CLIENTS_QUERY_KEY, id, 'timeline'],
      })
    },
  })

  return {
    updateClient: mutation.mutateAsync,
    updateClientStatus: mutation.status,
  }
}

export function useDeactivateClient(id: string) {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: () => clientsApi.deactivate(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: CLIENTS_LIST_QUERY_KEY })
      void queryClient.invalidateQueries({
        queryKey: [...CLIENTS_QUERY_KEY, id],
      })
      void queryClient.invalidateQueries({
        queryKey: [...CLIENTS_QUERY_KEY, id, 'timeline'],
      })
    },
  })

  return {
    deactivateClient: mutation.mutateAsync,
    deactivateClientStatus: mutation.status,
  }
}
