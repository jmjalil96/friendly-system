import { useCallback, useEffect, useMemo, useState } from 'react'
import type {
  ClaimHistoryResponse,
  ClaimTimelineResponse,
} from '@friendly-system/shared'
import {
  useClaimHistory,
  useClaimTimeline,
} from '@/features/claims/api/claims.hooks'
import { formatClaimDateTime } from '@/features/claims/model/claims.formatters'
import {
  CLAIM_TIMELINE_ACTION_LABELS,
  CLAIM_TIMELINE_ACTION_TONE_CLASSNAMES,
  getClaimTimelineMetadataLines,
} from '@/features/claims/model/claims.history'
import { CLAIM_STATUS_LABELS } from '@/features/claims/model/claims.status'

const HISTORY_PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const
const DEFAULT_HISTORY_PAGE = 1
const DEFAULT_HISTORY_LIMIT = 20

type ClaimHistoryItem = ClaimHistoryResponse['data'][number]
type ClaimTimelineItem = ClaimTimelineResponse['data'][number]

export interface ClaimHistoryTransitionItemViewModel {
  id: string
  fromStatusLabel: string
  toStatusLabel: string
  createdByLabel: string
  createdAtLabel: string
  reason?: string
  notes?: string
}

export interface ClaimTimelineActivityItemViewModel {
  id: string
  actionLabel: string
  actionToneClassName: string
  createdAtLabel: string
  userLabel: string
  metadataLines: string[]
}

export interface ClaimHistorySectionPagination {
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

interface ClaimHistorySectionViewModel<TItem> {
  items: TItem[]
  isLoading: boolean
  isError: boolean
  onRetry: () => void
  pagination: ClaimHistorySectionPagination
}

export interface UseClaimHistoryControllerParams {
  claimId: string
}

export interface UseClaimHistoryControllerResult {
  historySection: ClaimHistorySectionViewModel<ClaimHistoryTransitionItemViewModel>
  timelineSection: ClaimHistorySectionViewModel<ClaimTimelineActivityItemViewModel>
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

function toTransitionItemViewModel(
  item: ClaimHistoryItem,
): ClaimHistoryTransitionItemViewModel {
  const createdByName = formatActorName(
    item.createdByFirstName,
    item.createdByLastName,
  )

  return {
    id: item.id,
    fromStatusLabel: item.fromStatus
      ? CLAIM_STATUS_LABELS[item.fromStatus]
      : 'Sin estado previo',
    toStatusLabel: CLAIM_STATUS_LABELS[item.toStatus],
    createdByLabel: createdByName ?? 'Usuario',
    createdAtLabel: formatClaimDateTime(item.createdAt, 'datetime'),
    reason: item.reason ?? undefined,
    notes: item.notes ?? undefined,
  }
}

function toTimelineItemViewModel(
  item: ClaimTimelineItem,
): ClaimTimelineActivityItemViewModel {
  const userName = formatActorName(item.userFirstName, item.userLastName)

  return {
    id: item.id,
    actionLabel: CLAIM_TIMELINE_ACTION_LABELS[item.action],
    actionToneClassName: CLAIM_TIMELINE_ACTION_TONE_CLASSNAMES[item.action],
    createdAtLabel: formatClaimDateTime(item.createdAt, 'datetime'),
    userLabel: userName ?? (item.userId === null ? 'Sistema' : 'Usuario'),
    metadataLines: getClaimTimelineMetadataLines(item.action, item.metadata),
  }
}

export function useClaimHistoryController({
  claimId,
}: UseClaimHistoryControllerParams): UseClaimHistoryControllerResult {
  const [historyPage, setHistoryPage] = useState(DEFAULT_HISTORY_PAGE)
  const [historyLimit, setHistoryLimit] = useState(DEFAULT_HISTORY_LIMIT)
  const [timelinePage, setTimelinePage] = useState(DEFAULT_HISTORY_PAGE)
  const [timelineLimit, setTimelineLimit] = useState(DEFAULT_HISTORY_LIMIT)

  const historyQuery = useClaimHistory(claimId, {
    page: historyPage,
    limit: historyLimit,
  })
  const timelineQuery = useClaimTimeline(claimId, {
    page: timelinePage,
    limit: timelineLimit,
  })

  useEffect(() => {
    setHistoryPage(DEFAULT_HISTORY_PAGE)
    setHistoryLimit(DEFAULT_HISTORY_LIMIT)
    setTimelinePage(DEFAULT_HISTORY_PAGE)
    setTimelineLimit(DEFAULT_HISTORY_LIMIT)
  }, [claimId])

  const historyMeta = historyQuery.data?.meta
  const timelineMeta = timelineQuery.data?.meta

  const historyTotalCount = historyMeta?.totalCount ?? 0
  const historyTotalPages = Math.max(1, historyMeta?.totalPages ?? 1)
  const timelineTotalCount = timelineMeta?.totalCount ?? 0
  const timelineTotalPages = Math.max(1, timelineMeta?.totalPages ?? 1)

  useEffect(() => {
    if (historyPage <= historyTotalPages) return
    setHistoryPage(historyTotalPages)
  }, [historyPage, historyTotalPages])

  useEffect(() => {
    if (timelinePage <= timelineTotalPages) return
    setTimelinePage(timelineTotalPages)
  }, [timelinePage, timelineTotalPages])

  const historyItems = useMemo<ClaimHistoryTransitionItemViewModel[]>(
    () => (historyQuery.data?.data ?? []).map(toTransitionItemViewModel),
    [historyQuery.data?.data],
  )

  const timelineItems = useMemo<ClaimTimelineActivityItemViewModel[]>(
    () => (timelineQuery.data?.data ?? []).map(toTimelineItemViewModel),
    [timelineQuery.data?.data],
  )

  const onRetryHistory = useCallback(() => {
    void historyQuery.refetch()
  }, [historyQuery.refetch])

  const onRetryTimeline = useCallback(() => {
    void timelineQuery.refetch()
  }, [timelineQuery.refetch])

  const onHistoryFirstPage = useCallback(() => {
    setHistoryPage(1)
  }, [])

  const onHistoryPreviousPage = useCallback(() => {
    setHistoryPage((previous) => Math.max(1, previous - 1))
  }, [])

  const onHistoryNextPage = useCallback(() => {
    setHistoryPage((previous) => Math.min(historyTotalPages, previous + 1))
  }, [historyTotalPages])

  const onHistoryLastPage = useCallback(() => {
    setHistoryPage(historyTotalPages)
  }, [historyTotalPages])

  const onHistoryLimitChange = useCallback((value: number) => {
    if (
      !HISTORY_PAGE_SIZE_OPTIONS.includes(
        value as (typeof HISTORY_PAGE_SIZE_OPTIONS)[number],
      )
    ) {
      return
    }

    setHistoryLimit(value)
    setHistoryPage(1)
  }, [])

  const onTimelineFirstPage = useCallback(() => {
    setTimelinePage(1)
  }, [])

  const onTimelinePreviousPage = useCallback(() => {
    setTimelinePage((previous) => Math.max(1, previous - 1))
  }, [])

  const onTimelineNextPage = useCallback(() => {
    setTimelinePage((previous) => Math.min(timelineTotalPages, previous + 1))
  }, [timelineTotalPages])

  const onTimelineLastPage = useCallback(() => {
    setTimelinePage(timelineTotalPages)
  }, [timelineTotalPages])

  const onTimelineLimitChange = useCallback((value: number) => {
    if (
      !HISTORY_PAGE_SIZE_OPTIONS.includes(
        value as (typeof HISTORY_PAGE_SIZE_OPTIONS)[number],
      )
    ) {
      return
    }

    setTimelineLimit(value)
    setTimelinePage(1)
  }, [])

  return {
    historySection: {
      items: historyItems,
      isLoading: historyQuery.isLoading,
      isError: historyQuery.isError,
      onRetry: onRetryHistory,
      pagination: {
        page: historyPage,
        limit: historyLimit,
        limitOptions: HISTORY_PAGE_SIZE_OPTIONS,
        totalCount: historyTotalCount,
        totalPages: historyTotalPages,
        onFirstPage: onHistoryFirstPage,
        onPreviousPage: onHistoryPreviousPage,
        onNextPage: onHistoryNextPage,
        onLastPage: onHistoryLastPage,
        onLimitChange: onHistoryLimitChange,
      },
    },
    timelineSection: {
      items: timelineItems,
      isLoading: timelineQuery.isLoading,
      isError: timelineQuery.isError,
      onRetry: onRetryTimeline,
      pagination: {
        page: timelinePage,
        limit: timelineLimit,
        limitOptions: HISTORY_PAGE_SIZE_OPTIONS,
        totalCount: timelineTotalCount,
        totalPages: timelineTotalPages,
        onFirstPage: onTimelineFirstPage,
        onPreviousPage: onTimelinePreviousPage,
        onNextPage: onTimelineNextPage,
        onLastPage: onTimelineLastPage,
        onLimitChange: onTimelineLimitChange,
      },
    },
  }
}
