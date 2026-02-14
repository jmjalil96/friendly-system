import { Plus } from 'lucide-react'
import { Button } from '@/shared/ui/primitives/button'
import {
  PageHeader,
  PageHeaderActionGroup,
} from '@/shared/ui/composites/page-header'
import { INSURERS_PRIMARY_ACTION_BUTTON_CLASSNAME } from '@/features/insurers/model/insurers.ui-tokens'

export interface InsurersListHeaderProps {
  onCreateInsurer: () => void
  className?: string
  title?: string
  subtitle?: string
}

export function InsurersListHeader({
  onCreateInsurer,
  className,
  title = 'Todas las aseguradoras',
  subtitle = 'Lista completa de aseguradoras registradas en el sistema',
}: InsurersListHeaderProps) {
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
            onClick={onCreateInsurer}
            className={INSURERS_PRIMARY_ACTION_BUTTON_CLASSNAME}
          >
            <Plus />
            Nueva aseguradora
          </Button>
        </PageHeaderActionGroup>
      }
    />
  )
}
