import { useCallback, useEffect, useMemo, useState } from 'react'
import type { InsurerTimelineResponse } from '@friendly-system/shared'
import { useInsurerTimeline } from '@/features/insurers/api/insurers.hooks'
import { formatInsurerDateTime } from '@/features/insurers/model/insurers.formatters'
import {
  INSURER_TIMELINE_ACTION_LABELS,
  INSURER_TIMELINE_ACTION_TONE_CLASSNAMES,
  getInsurerTimelineMetadataLines,
} from '@/features/insurers/model/insurers.history'

const HISTORY_PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const
const DEFAULT_HISTORY_PAGE = 1
const DEFAULT_HISTORY_LIMIT = 20

type InsurerTimelineItem = InsurerTimelineResponse['data'][number]

export interface InsurerTimelineItemViewModel {
  id: string
  actionLabel: string
  actionToneClassName: string
  createdAtLabel: string
  userLabel: string
  metadataLines: string[]
}

export interface InsurerHistoryPagination {
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

export interface UseInsurerHistoryControllerParams {
  insurerId: string
}

export interface UseInsurerHistoryControllerResult {
  items: InsurerTimelineItemViewModel[]
  isLoading: boolean
  isError: boolean
  onRetry: () => void
  pagination: InsurerHistoryPagination
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
  item: InsurerTimelineItem,
): InsurerTimelineItemViewModel {
  const userName = formatActorName(item.userFirstName, item.userLastName)

  return {
    id: item.id,
    actionLabel: INSURER_TIMELINE_ACTION_LABELS[item.action],
    actionToneClassName: INSURER_TIMELINE_ACTION_TONE_CLASSNAMES[item.action],
    createdAtLabel: formatInsurerDateTime(item.createdAt, 'datetime'),
    userLabel: userName ?? (item.userId === null ? 'Sistema' : 'Usuario'),
    metadataLines: getInsurerTimelineMetadataLines(item.action, item.metadata),
  }
}

export function useInsurerHistoryController({
  insurerId,
}: UseInsurerHistoryControllerParams): UseInsurerHistoryControllerResult {
  const [page, setPage] = useState(DEFAULT_HISTORY_PAGE)
  const [limit, setLimit] = useState(DEFAULT_HISTORY_LIMIT)

  const timelineQuery = useInsurerTimeline(insurerId, { page, limit })

  useEffect(() => {
    setPage(DEFAULT_HISTORY_PAGE)
    setLimit(DEFAULT_HISTORY_LIMIT)
  }, [insurerId])

  const meta = timelineQuery.data?.meta
  const totalCount = meta?.totalCount ?? 0
  const totalPages = Math.max(1, meta?.totalPages ?? 1)

  useEffect(() => {
    if (page <= totalPages) return
    setPage(totalPages)
  }, [page, totalPages])

  const items = useMemo<InsurerTimelineItemViewModel[]>(
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
