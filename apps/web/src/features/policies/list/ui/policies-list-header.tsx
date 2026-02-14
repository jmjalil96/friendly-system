import { Plus } from 'lucide-react'
import { Button } from '@/shared/ui/primitives/button'
import {
  PageHeader,
  PageHeaderActionGroup,
} from '@/shared/ui/composites/page-header'
import { POLICIES_PRIMARY_ACTION_BUTTON_CLASSNAME } from '@/features/policies/model/policies.ui-tokens'

export interface PoliciesListHeaderProps {
  onCreatePolicy: () => void
  className?: string
  title?: string
  subtitle?: string
}

export function PoliciesListHeader({
  onCreatePolicy,
  className,
  title = 'Todas las pólizas',
  subtitle = 'Lista completa de pólizas registradas en el sistema',
}: PoliciesListHeaderProps) {
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
            onClick={onCreatePolicy}
            className={POLICIES_PRIMARY_ACTION_BUTTON_CLASSNAME}
          >
            <Plus />
            Nueva póliza
          </Button>
        </PageHeaderActionGroup>
      }
    />
  )
}
