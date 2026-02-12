import { Plus } from 'lucide-react'
import { Button } from '@/shared/ui/primitives/button'
import {
  PageHeader,
  PageHeaderActionGroup,
} from '@/shared/ui/composites/page-header'
import { CLAIMS_PRIMARY_ACTION_BUTTON_CLASSNAME } from '@/features/claims/model/claims.ui-tokens'

export interface ClaimsListHeaderProps {
  onCreateClaim: () => void
  className?: string
  title?: string
  subtitle?: string
}

export function ClaimsListHeader({
  onCreateClaim,
  className,
  title = 'Todos los reclamos',
  subtitle = 'Lista completa de reclamos ingresados en el sistema',
}: ClaimsListHeaderProps) {
  return (
    <PageHeader
      stickyMode="none"
      className={className}
      title={title}
      subtitle={subtitle}
      actions={
        <PageHeaderActionGroup>
          <Button
            size="sm"
            onClick={onCreateClaim}
            className={CLAIMS_PRIMARY_ACTION_BUTTON_CLASSNAME}
          >
            <Plus />
            Nuevo reclamo
          </Button>
        </PageHeaderActionGroup>
      }
    />
  )
}
