import { useCallback, useEffect, useState } from 'react'
import type { GetPolicyByIdResponse } from '@friendly-system/shared'
import {
  usePolicyById,
  useDeletePolicy,
} from '@/features/policies/api/policies.hooks'

interface PolicyDetailHeaderActionsProps {
  canDelete: boolean
  isDeleting: boolean
  onDeleteRequest: () => void
}

interface PolicyDetailHeaderProps {
  subtitle: string
  onBack: () => void
  actions: PolicyDetailHeaderActionsProps
}

interface PolicyDetailTabsProps {
  policyId: string
  policy?: GetPolicyByIdResponse
  isLoading: boolean
  isError: boolean
  onRetry: () => void
}

interface PolicyDeleteDialogProps {
  open: boolean
  policyNumber?: string
  isDeleting: boolean
  onOpenChange: (open: boolean) => void
  onConfirmDelete: () => Promise<void>
}

export interface UsePolicyDetailControllerParams {
  policyId: string
  onBack: () => void
}

export interface UsePolicyDetailControllerResult {
  headerProps: PolicyDetailHeaderProps
  tabsProps: PolicyDetailTabsProps
  deleteDialogProps: PolicyDeleteDialogProps
}

export function usePolicyDetailController({
  policyId,
  onBack,
}: UsePolicyDetailControllerParams): UsePolicyDetailControllerResult {
  const policyQuery = usePolicyById(policyId)
  const { deletePolicy, deletePolicyStatus } = useDeletePolicy()
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  const isDeleting = deletePolicyStatus === 'pending'
  const canDelete =
    Boolean(policyQuery.data) && !policyQuery.isLoading && !policyQuery.isError

  useEffect(() => {
    setDeleteDialogOpen(false)
  }, [policyId])

  const subtitle = policyQuery.isLoading
    ? 'Cargando póliza...'
    : policyQuery.data
      ? `Póliza ${policyQuery.data.policyNumber}`
      : 'No pudimos cargar el número de póliza'

  const onRetry = useCallback(() => {
    void policyQuery.refetch()
  }, [policyQuery.refetch])

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
    await deletePolicy(policyId)
  }, [canDelete, policyId, deletePolicy, isDeleting])

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
      policyId,
      policy: policyQuery.data,
      isLoading: policyQuery.isLoading,
      isError: policyQuery.isError,
      onRetry,
    },
    deleteDialogProps: {
      open: deleteDialogOpen,
      policyNumber: policyQuery.data?.policyNumber,
      isDeleting,
      onOpenChange: onDeleteDialogOpenChange,
      onConfirmDelete,
    },
  }
}
