import { useCallback, useEffect, useState } from 'react'
import type { GetInsurerByIdResponse } from '@friendly-system/shared'
import {
  useDeactivateInsurer,
  useInsurerById,
} from '@/features/insurers/api/insurers.hooks'

interface InsurerDetailHeaderActionsProps {
  canDeactivate: boolean
  isDeactivating: boolean
  onDeactivateRequest: () => void
}

interface InsurerDetailHeaderProps {
  subtitle: string
  onBack: () => void
  actions: InsurerDetailHeaderActionsProps
}

interface InsurerDetailTabsProps {
  insurerId: string
  insurer?: GetInsurerByIdResponse
  isLoading: boolean
  isError: boolean
  onRetry: () => void
}

interface InsurerDeactivateDialogProps {
  open: boolean
  insurerName?: string
  isDeactivating: boolean
  onOpenChange: (open: boolean) => void
  onConfirmDeactivate: () => Promise<void>
}

export interface UseInsurerDetailControllerParams {
  insurerId: string
  onBack: () => void
}

export interface UseInsurerDetailControllerResult {
  headerProps: InsurerDetailHeaderProps
  tabsProps: InsurerDetailTabsProps
  deactivateDialogProps: InsurerDeactivateDialogProps
}

export function useInsurerDetailController({
  insurerId,
  onBack,
}: UseInsurerDetailControllerParams): UseInsurerDetailControllerResult {
  const insurerQuery = useInsurerById(insurerId)
  const { deactivateInsurer, deactivateInsurerStatus } =
    useDeactivateInsurer(insurerId)
  const [deactivateDialogOpen, setDeactivateDialogOpen] = useState(false)

  const isDeactivating = deactivateInsurerStatus === 'pending'
  const canDeactivate =
    Boolean(insurerQuery.data) &&
    insurerQuery.data?.isActive === true &&
    !insurerQuery.isLoading &&
    !insurerQuery.isError

  useEffect(() => {
    setDeactivateDialogOpen(false)
  }, [insurerId])

  const subtitle = insurerQuery.isLoading
    ? 'Cargando aseguradora...'
    : insurerQuery.data
      ? insurerQuery.data.name
      : 'No pudimos cargar la aseguradora'

  const onRetry = useCallback(() => {
    void insurerQuery.refetch()
  }, [insurerQuery.refetch])

  const onDeactivateRequest = useCallback(() => {
    if (!canDeactivate || isDeactivating) return
    setDeactivateDialogOpen(true)
  }, [canDeactivate, isDeactivating])

  const onDeactivateDialogOpenChange = useCallback(
    (open: boolean) => {
      if (!open && isDeactivating) return
      setDeactivateDialogOpen(open)
    },
    [isDeactivating],
  )

  const onConfirmDeactivate = useCallback(async () => {
    if (!canDeactivate || isDeactivating) return
    await deactivateInsurer()
    setDeactivateDialogOpen(false)
    void insurerQuery.refetch()
  }, [canDeactivate, insurerQuery, deactivateInsurer, isDeactivating])

  return {
    headerProps: {
      subtitle,
      onBack,
      actions: {
        canDeactivate,
        isDeactivating,
        onDeactivateRequest,
      },
    },
    tabsProps: {
      insurerId,
      insurer: insurerQuery.data,
      isLoading: insurerQuery.isLoading,
      isError: insurerQuery.isError,
      onRetry,
    },
    deactivateDialogProps: {
      open: deactivateDialogOpen,
      insurerName: insurerQuery.data?.name,
      isDeactivating,
      onOpenChange: onDeactivateDialogOpenChange,
      onConfirmDeactivate,
    },
  }
}
