export const POLICIES_QUERY_KEY = ['policies'] as const
export const POLICIES_LIST_QUERY_KEY = ['policies', 'list'] as const
export const POLICIES_LOOKUP_QUERY_KEY = ['policies', 'lookup'] as const

type PoliciesQueryPolicy = Readonly<{
  staleTime: number
  refetchOnWindowFocus: boolean
  refetchOnReconnect: boolean
}>

export const POLICIES_OPERATIONAL_QUERY_OPTIONS = {
  staleTime: 30_000,
  refetchOnWindowFocus: true,
  refetchOnReconnect: true,
} as const satisfies PoliciesQueryPolicy

export const POLICIES_LOOKUP_QUERY_OPTIONS = {
  staleTime: 300_000,
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
} as const satisfies PoliciesQueryPolicy
