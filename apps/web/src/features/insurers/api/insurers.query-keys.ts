export const INSURERS_QUERY_KEY = ['insurers'] as const
export const INSURERS_LIST_QUERY_KEY = ['insurers', 'list'] as const

type InsurersQueryPolicy = Readonly<{
  staleTime: number
  refetchOnWindowFocus: boolean
  refetchOnReconnect: boolean
}>

export const INSURERS_OPERATIONAL_QUERY_OPTIONS = {
  staleTime: 30_000,
  refetchOnWindowFocus: true,
  refetchOnReconnect: true,
} as const satisfies InsurersQueryPolicy
