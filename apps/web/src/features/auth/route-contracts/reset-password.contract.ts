export interface ResetPasswordRouteSearch {
  token: string
}

export function parseResetPasswordSearch(
  search: Record<string, unknown>,
): ResetPasswordRouteSearch {
  return {
    token: typeof search.token === 'string' ? search.token : '',
  }
}
