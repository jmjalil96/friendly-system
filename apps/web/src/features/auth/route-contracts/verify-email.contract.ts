export interface VerifyEmailRouteSearch {
  token: string
}

export function parseVerifyEmailSearch(
  search: Record<string, unknown>,
): VerifyEmailRouteSearch {
  return {
    token: typeof search.token === 'string' ? search.token : '',
  }
}
