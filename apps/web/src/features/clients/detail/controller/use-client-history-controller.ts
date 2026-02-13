import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ClientTimelineResponse } from '@friendly-system/shared'
import { useClientTimeline } from '@/features/clients/api/clients.hooks'
import { formatClientDateTime } from '@/features/clients/model/clients.formatters'
import {
  CLIENT_TIMELINE_ACTION_LABELS,
  CLIENT_TIMELINE_ACTION_TONE_CLASSNAMES,
  getClientTimelineMetadataLines,
} from '@/features/clients/model/clients.history'

const HISTORY_PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const
const DEFAULT_HISTORY_PAGE = 1
const DEFAULT_HISTORY_LIMIT = 20

type ClientTimelineItem = ClientTimelineResponse['data'][number]

export interface ClientTimelineItemViewModel {
  id: string
  actionLabel: string
  actionToneClassName: string
  createdAtLabel: string
  userLabel: string
  metadataLines: string[]
}

export interface ClientHistoryPagination {
  page: number
  limit: number
  limitOptions: readonly number[]
  totalCount: number
  totalPages: number
  onFirstPage: () => void
  onPreviousPage: () => void
  onNextPage: () => void
  onLastPage: () => void
  onLimitChange: (value: number) => void
}

export interface UseClientHistoryControllerParams {
  clientId: string
}

export interface UseClientHistoryControllerResult {
  items: ClientTimelineItemViewModel[]
  isLoading: boolean
  isError: boolean
  onRetry: () => void
  pagination: ClientHistoryPagination
}

function formatActorName(
  firstName: string | null,
  lastName: string | null,
): string | null {
  const normalizedFirstName = firstName?.trim() ?? ''
  const normalizedLastName = lastName?.trim() ?? ''
  const fullName = `${normalizedFirstName} ${normalizedLastName}`.trim()

  return fullName.length > 0 ? fullName : null
}

function toTimelineItemViewModel(
  item: ClientTimelineItem,
): ClientTimelineItemViewModel {
  const userName = formatActorName(item.userFirstName, item.userLastName)

  return {
    id: item.id,
    actionLabel: CLIENT_TIMELINE_ACTION_LABELS[item.action],
    actionToneClassName: CLIENT_TIMELINE_ACTION_TONE_CLASSNAMES[item.action],
    createdAtLabel: formatClientDateTime(item.createdAt, 'datetime'),
    userLabel: userName ?? (item.userId === null ? 'Sistema' : 'Usuario'),
    metadataLines: getClientTimelineMetadataLines(item.action, item.metadata),
  }
}

export function useClientHistoryController({
  clientId,
}: UseClientHistoryControllerParams): UseClientHistoryControllerResult {
  const [page, setPage] = useState(DEFAULT_HISTORY_PAGE)
  const [limit, setLimit] = useState(DEFAULT_HISTORY_LIMIT)

  const timelineQuery = useClientTimeline(clientId, { page, limit })

  useEffect(() => {
    setPage(DEFAULT_HISTORY_PAGE)
    setLimit(DEFAULT_HISTORY_LIMIT)
  }, [clientId])

  const meta = timelineQuery.data?.meta
  const totalCount = meta?.totalCount ?? 0
  const totalPages = Math.max(1, meta?.totalPages ?? 1)

  useEffect(() => {
    if (page <= totalPages) return
    setPage(totalPages)
  }, [page, totalPages])

  const items = useMemo<ClientTimelineItemViewModel[]>(
    () => (timelineQuery.data?.data ?? []).map(toTimelineItemViewModel),
    [timelineQuery.data?.data],
  )

  const onRetry = useCallback(() => {
    void timelineQuery.refetch()
  }, [timelineQuery.refetch])

  const onFirstPage = useCallback(() => {
    setPage(1)
  }, [])

  const onPreviousPage = useCallback(() => {
    setPage((previous) => Math.max(1, previous - 1))
  }, [])

  const onNextPage = useCallback(() => {
    setPage((previous) => Math.min(totalPages, previous + 1))
  }, [totalPages])

  const onLastPage = useCallback(() => {
    setPage(totalPages)
  }, [totalPages])

  const onLimitChange = useCallback((value: number) => {
    if (
      !HISTORY_PAGE_SIZE_OPTIONS.includes(
        value as (typeof HISTORY_PAGE_SIZE_OPTIONS)[number],
      )
    ) {
      return
    }

    setLimit(value)
    setPage(1)
  }, [])

  return {
    items,
    isLoading: timelineQuery.isLoading,
    isError: timelineQuery.isError,
    onRetry,
    pagination: {
      page,
      limit,
      limitOptions: HISTORY_PAGE_SIZE_OPTIONS,
      totalCount,
      totalPages,
      onFirstPage,
      onPreviousPage,
      onNextPage,
      onLastPage,
      onLimitChange,
    },
  }
}
