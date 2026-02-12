import { useCallback } from 'react'
import type { GetClaimByIdResponse } from '@friendly-system/shared'
import { useClaimById } from '@/features/claims/api/claims.hooks'

interface ClaimDetailHeaderProps {
  subtitle: string
  onBack: () => void
}

interface ClaimDetailTabsProps {
  claimId: string
  claim?: GetClaimByIdResponse
  isLoading: boolean
  isError: boolean
  onRetry: () => void
}

export interface UseClaimDetailControllerParams {
  claimId: string
  onBack: () => void
}

export interface UseClaimDetailControllerResult {
  headerProps: ClaimDetailHeaderProps
  tabsProps: ClaimDetailTabsProps
}

export function useClaimDetailController({
  claimId,
  onBack,
}: UseClaimDetailControllerParams): UseClaimDetailControllerResult {
  const claimQuery = useClaimById(claimId)

  const subtitle = claimQuery.isLoading
    ? 'Cargando reclamo...'
    : claimQuery.data
      ? `Reclamo #${claimQuery.data.claimNumber}`
      : 'No pudimos cargar el numero de reclamo'

  const onRetry = useCallback(() => {
    void claimQuery.refetch()
  }, [claimQuery.refetch])

  return {
    headerProps: {
      subtitle,
      onBack,
    },
    tabsProps: {
      claimId,
      claim: claimQuery.data,
      isLoading: claimQuery.isLoading,
      isError: claimQuery.isError,
      onRetry,
    },
  }
}
