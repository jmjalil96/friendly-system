import { useCallback, useEffect, useState } from 'react'
import type { GetClaimByIdResponse } from '@friendly-system/shared'
import {
  useClaimById,
  useDeleteClaim,
} from '@/features/claims/api/claims.hooks'

interface ClaimDetailHeaderActionsProps {
  canDelete: boolean
  isDeleting: boolean
  onDeleteRequest: () => void
}

interface ClaimDetailHeaderProps {
  subtitle: string
  onBack: () => void
  actions: ClaimDetailHeaderActionsProps
}

interface ClaimDetailTabsProps {
  claimId: string
  claim?: GetClaimByIdResponse
  isLoading: boolean
  isError: boolean
  onRetry: () => void
}

interface ClaimDeleteDialogProps {
  open: boolean
  claimNumber?: number
  isDeleting: boolean
  onOpenChange: (open: boolean) => void
  onConfirmDelete: () => Promise<void>
}

export interface UseClaimDetailControllerParams {
  claimId: string
  onBack: () => void
}

export interface UseClaimDetailControllerResult {
  headerProps: ClaimDetailHeaderProps
  tabsProps: ClaimDetailTabsProps
  deleteDialogProps: ClaimDeleteDialogProps
}

export function useClaimDetailController({
  claimId,
  onBack,
}: UseClaimDetailControllerParams): UseClaimDetailControllerResult {
  const claimQuery = useClaimById(claimId)
  const { deleteClaim, deleteClaimStatus } = useDeleteClaim()
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  const isDeleting = deleteClaimStatus === 'pending'
  const canDelete =
    Boolean(claimQuery.data) && !claimQuery.isLoading && !claimQuery.isError

  useEffect(() => {
    setDeleteDialogOpen(false)
  }, [claimId])

  const subtitle = claimQuery.isLoading
    ? 'Cargando reclamo...'
    : claimQuery.data
      ? `Reclamo #${claimQuery.data.claimNumber}`
      : 'No pudimos cargar el numero de reclamo'

  const onRetry = useCallback(() => {
    void claimQuery.refetch()
  }, [claimQuery.refetch])

  const onDeleteRequest = useCallback(() => {
    if (!canDelete || isDeleting) return
    setDeleteDialogOpen(true)
  }, [canDelete, isDeleting])

  const onDeleteDialogOpenChange = useCallback(
    (open: boolean) => {
      if (!open && isDeleting) return
      setDeleteDialogOpen(open)
    },
    [isDeleting],
  )

  const onConfirmDelete = useCallback(async () => {
    if (!canDelete || isDeleting) return
    await deleteClaim(claimId)
  }, [canDelete, claimId, deleteClaim, isDeleting])

  return {
    headerProps: {
      subtitle,
      onBack,
      actions: {
        canDelete,
        isDeleting,
        onDeleteRequest,
      },
    },
    tabsProps: {
      claimId,
      claim: claimQuery.data,
      isLoading: claimQuery.isLoading,
      isError: claimQuery.isError,
      onRetry,
    },
    deleteDialogProps: {
      open: deleteDialogOpen,
      claimNumber: claimQuery.data?.claimNumber,
      isDeleting,
      onOpenChange: onDeleteDialogOpenChange,
      onConfirmDelete,
    },
  }
}
