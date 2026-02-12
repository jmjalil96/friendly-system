export const CLAIMS_QUERY_KEY = ['claims'] as const
export const CLAIMS_LIST_QUERY_KEY = ['claims', 'list'] as const
export const CLAIMS_LOOKUP_QUERY_KEY = ['claims', 'lookup'] as const

type ClaimsQueryPolicy = Readonly<{
  staleTime: number
  refetchOnWindowFocus: boolean
  refetchOnReconnect: boolean
}>

export const CLAIMS_OPERATIONAL_QUERY_OPTIONS = {
  staleTime: 30_000,
  refetchOnWindowFocus: true,
  refetchOnReconnect: true,
} as const satisfies ClaimsQueryPolicy

export const CLAIMS_LOOKUP_QUERY_OPTIONS = {
  staleTime: 300_000,
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
} as const satisfies ClaimsQueryPolicy
