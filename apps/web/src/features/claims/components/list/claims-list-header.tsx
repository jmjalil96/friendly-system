import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  PageHeader,
  PageHeaderActionGroup,
} from '@/components/ui/page-header'

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
      className={className}
      title={title}
      subtitle={subtitle}
      actions={
        <PageHeaderActionGroup>
          <Button
            size="sm"
            onClick={onCreateClaim}
            className="bg-[var(--color-red-500)] text-white shadow-sm hover:bg-[var(--color-red-700)]"
          >
            <Plus />
            Nuevo reclamo
          </Button>
        </PageHeaderActionGroup>
      }
    />
  )
}
