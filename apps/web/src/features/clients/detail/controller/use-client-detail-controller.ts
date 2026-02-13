import { useCallback, useEffect, useState } from 'react'
import type { GetClientByIdResponse } from '@friendly-system/shared'
import {
  useClientById,
  useDeactivateClient,
} from '@/features/clients/api/clients.hooks'

interface ClientDetailHeaderActionsProps {
  canDeactivate: boolean
  isDeactivating: boolean
  onDeactivateRequest: () => void
}

interface ClientDetailHeaderProps {
  subtitle: string
  onBack: () => void
  actions: ClientDetailHeaderActionsProps
}

interface ClientDetailTabsProps {
  clientId: string
  client?: GetClientByIdResponse
  isLoading: boolean
  isError: boolean
  onRetry: () => void
}

interface ClientDeactivateDialogProps {
  open: boolean
  clientName?: string
  isDeactivating: boolean
  onOpenChange: (open: boolean) => void
  onConfirmDeactivate: () => Promise<void>
}

export interface UseClientDetailControllerParams {
  clientId: string
  onBack: () => void
}

export interface UseClientDetailControllerResult {
  headerProps: ClientDetailHeaderProps
  tabsProps: ClientDetailTabsProps
  deactivateDialogProps: ClientDeactivateDialogProps
}

export function useClientDetailController({
  clientId,
  onBack,
}: UseClientDetailControllerParams): UseClientDetailControllerResult {
  const clientQuery = useClientById(clientId)
  const { deactivateClient, deactivateClientStatus } =
    useDeactivateClient(clientId)
  const [deactivateDialogOpen, setDeactivateDialogOpen] = useState(false)

  const isDeactivating = deactivateClientStatus === 'pending'
  const canDeactivate =
    Boolean(clientQuery.data) &&
    clientQuery.data?.isActive === true &&
    !clientQuery.isLoading &&
    !clientQuery.isError

  useEffect(() => {
    setDeactivateDialogOpen(false)
  }, [clientId])

  const subtitle = clientQuery.isLoading
    ? 'Cargando cliente...'
    : clientQuery.data
      ? clientQuery.data.name
      : 'No pudimos cargar el cliente'

  const onRetry = useCallback(() => {
    void clientQuery.refetch()
  }, [clientQuery.refetch])

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
    await deactivateClient()
    setDeactivateDialogOpen(false)
    void clientQuery.refetch()
  }, [canDeactivate, clientQuery, deactivateClient, isDeactivating])

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
      clientId,
      client: clientQuery.data,
      isLoading: clientQuery.isLoading,
      isError: clientQuery.isError,
      onRetry,
    },
    deactivateDialogProps: {
      open: deactivateDialogOpen,
      clientName: clientQuery.data?.name,
      isDeactivating,
      onOpenChange: onDeactivateDialogOpenChange,
      onConfirmDeactivate,
    },
  }
}
