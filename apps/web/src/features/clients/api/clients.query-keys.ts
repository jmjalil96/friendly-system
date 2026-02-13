export const CLIENTS_QUERY_KEY = ['clients'] as const
export const CLIENTS_LIST_QUERY_KEY = ['clients', 'list'] as const

type ClientsQueryPolicy = Readonly<{
  staleTime: number
  refetchOnWindowFocus: boolean
  refetchOnReconnect: boolean
}>

export const CLIENTS_OPERATIONAL_QUERY_OPTIONS = {
  staleTime: 30_000,
  refetchOnWindowFocus: true,
  refetchOnReconnect: true,
} as const satisfies ClientsQueryPolicy
