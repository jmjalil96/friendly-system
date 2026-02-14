import {
  PageHeader,
  PageHeaderActionGroup,
} from '@/shared/ui/composites/page-header'
import {
  PolicyDetailHeaderActions,
  type PolicyDetailHeaderActionsProps as PolicyDetailHeaderActionsUIProps,
} from './policy-detail-header-actions'

interface PolicyDetailHeaderActionsProps {
  canDelete: boolean
  isDeleting: boolean
  onDeleteRequest: () => void
}

export interface PolicyDetailHeaderProps {
  subtitle: string
  onBack: () => void
  actions: PolicyDetailHeaderActionsProps
  className?: string
}

export function PolicyDetailHeader({
  subtitle,
  onBack,
  actions,
  className,
}: PolicyDetailHeaderProps) {
  const actionProps: PolicyDetailHeaderActionsUIProps = {
    disabled: !actions.canDelete,
    isDeleting: actions.isDeleting,
    onDeleteRequest: actions.onDeleteRequest,
  }

  return (
    <PageHeader
      className={className}
      stickyMode="desktop"
      title="Detalle de la póliza"
      subtitle={subtitle}
      onBack={onBack}
      backLabel="Volver a la lista"
      actions={
        <PageHeaderActionGroup>
          <PolicyDetailHeaderActions {...actionProps} />
        </PageHeaderActionGroup>
      }
    />
  )
}
