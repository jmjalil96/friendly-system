import {
  PageHeader,
  PageHeaderActionGroup,
} from '@/shared/ui/composites/page-header'
import {
  InsurerDetailHeaderActions,
  type InsurerDetailHeaderActionsProps as InsurerDetailHeaderActionsUIProps,
} from './insurer-detail-header-actions'

interface InsurerDetailHeaderActionsProps {
  canDeactivate: boolean
  isDeactivating: boolean
  onDeactivateRequest: () => void
}

export interface InsurerDetailHeaderProps {
  subtitle: string
  onBack: () => void
  actions: InsurerDetailHeaderActionsProps
  className?: string
}

export function InsurerDetailHeader({
  subtitle,
  onBack,
  actions,
  className,
}: InsurerDetailHeaderProps) {
  const actionProps: InsurerDetailHeaderActionsUIProps = {
    disabled: !actions.canDeactivate,
    isDeactivating: actions.isDeactivating,
    onDeactivateRequest: actions.onDeactivateRequest,
  }

  return (
    <PageHeader
      className={className}
      stickyMode="desktop"
      title="Detalle de la aseguradora"
      subtitle={subtitle}
      onBack={onBack}
      backLabel="Volver a la lista"
      actions={
        <PageHeaderActionGroup>
          <InsurerDetailHeaderActions {...actionProps} />
        </PageHeaderActionGroup>
      }
    />
  )
}
