import {
  PageHeader,
  PageHeaderActionGroup,
} from '@/shared/ui/composites/page-header'
import {
  ClaimDetailHeaderActions,
  type ClaimDetailHeaderActionsProps as ClaimDetailHeaderActionsUIProps,
} from './claim-detail-header-actions'

interface ClaimDetailHeaderActionsProps {
  canDelete: boolean
  isDeleting: boolean
  onDeleteRequest: () => void
}

export interface ClaimDetailHeaderProps {
  subtitle: string
  onBack: () => void
  actions: ClaimDetailHeaderActionsProps
  className?: string
}

export function ClaimDetailHeader({
  subtitle,
  onBack,
  actions,
  className,
}: ClaimDetailHeaderProps) {
  const actionProps: ClaimDetailHeaderActionsUIProps = {
    disabled: !actions.canDelete,
    isDeleting: actions.isDeleting,
    onDeleteRequest: actions.onDeleteRequest,
  }

  return (
    <PageHeader
      className={className}
      stickyMode="desktop"
      title="Detalle del reclamo"
      subtitle={subtitle}
      onBack={onBack}
      backLabel="Volver a la lista"
      actions={
        <PageHeaderActionGroup>
          <ClaimDetailHeaderActions {...actionProps} />
        </PageHeaderActionGroup>
      }
    />
  )
}
