import {
  PageHeader,
  PageHeaderActionGroup,
} from '@/shared/ui/composites/page-header'
import {
  ClientDetailHeaderActions,
  type ClientDetailHeaderActionsProps as ClientDetailHeaderActionsUIProps,
} from './client-detail-header-actions'

interface ClientDetailHeaderActionsProps {
  canDeactivate: boolean
  isDeactivating: boolean
  onDeactivateRequest: () => void
}

export interface ClientDetailHeaderProps {
  subtitle: string
  onBack: () => void
  actions: ClientDetailHeaderActionsProps
  className?: string
}

export function ClientDetailHeader({
  subtitle,
  onBack,
  actions,
  className,
}: ClientDetailHeaderProps) {
  const actionProps: ClientDetailHeaderActionsUIProps = {
    disabled: !actions.canDeactivate,
    isDeactivating: actions.isDeactivating,
    onDeactivateRequest: actions.onDeactivateRequest,
  }

  return (
    <PageHeader
      className={className}
      stickyMode="desktop"
      title="Detalle del cliente"
      subtitle={subtitle}
      onBack={onBack}
      backLabel="Volver a la lista"
      actions={
        <PageHeaderActionGroup>
          <ClientDetailHeaderActions {...actionProps} />
        </PageHeaderActionGroup>
      }
    />
  )
}
