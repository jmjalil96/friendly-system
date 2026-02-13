import { parseClientsListSearch } from '@/features/clients/model/clients.search'

export function parseClientsListRouteSearch(search: Record<string, unknown>) {
  return parseClientsListSearch(search)
}
