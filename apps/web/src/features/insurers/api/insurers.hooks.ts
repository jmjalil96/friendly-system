import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type {
  CreateInsurerInput,
  ListInsurersQuery,
  UpdateInsurerInput,
} from '@friendly-system/shared'
import { insurersApi } from './insurers.api'
import {
  INSURERS_LIST_QUERY_KEY,
  INSURERS_QUERY_KEY,
} from './insurers.query-keys'
import {
  insurerByIdQueryOptions,
  insurerTimelineQueryOptions,
  listInsurersQueryOptions,
} from './insurers.query-options'

export {
  insurerByIdQueryOptions,
  insurerTimelineQueryOptions,
  listInsurersQueryOptions,
}

export function useListInsurers(filters: Partial<ListInsurersQuery> = {}) {
  return useQuery(listInsurersQueryOptions(filters))
}

export function useInsurerById(id: string) {
  return useQuery(insurerByIdQueryOptions(id))
}

export function useInsurerTimeline(
  id: string,
  query: Record<string, unknown> = {},
) {
  return useQuery(insurerTimelineQueryOptions(id, query))
}

export function useCreateInsurer() {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: (input: CreateInsurerInput) => insurersApi.create(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: INSURERS_LIST_QUERY_KEY })
    },
  })

  return {
    createInsurer: mutation.mutateAsync,
    createInsurerStatus: mutation.status,
  }
}

export function useUpdateInsurer(id: string) {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: (input: UpdateInsurerInput) => insurersApi.update(id, input),
    onSuccess: (data) => {
      queryClient.setQueryData([...INSURERS_QUERY_KEY, id], data)
      void queryClient.invalidateQueries({ queryKey: INSURERS_LIST_QUERY_KEY })
      void queryClient.invalidateQueries({
        queryKey: [...INSURERS_QUERY_KEY, id, 'timeline'],
      })
    },
  })

  return {
    updateInsurer: mutation.mutateAsync,
    updateInsurerStatus: mutation.status,
  }
}

export function useDeactivateInsurer(id: string) {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: () => insurersApi.deactivate(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: INSURERS_LIST_QUERY_KEY })
      void queryClient.invalidateQueries({
        queryKey: [...INSURERS_QUERY_KEY, id],
      })
      void queryClient.invalidateQueries({
        queryKey: [...INSURERS_QUERY_KEY, id, 'timeline'],
      })
    },
  })

  return {
    deactivateInsurer: mutation.mutateAsync,
    deactivateInsurerStatus: mutation.status,
  }
}
