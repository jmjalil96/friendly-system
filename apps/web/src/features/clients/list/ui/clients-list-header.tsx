import { Plus } from 'lucide-react'
import { Button } from '@/shared/ui/primitives/button'
import {
  PageHeader,
  PageHeaderActionGroup,
} from '@/shared/ui/composites/page-header'
import { CLIENTS_PRIMARY_ACTION_BUTTON_CLASSNAME } from '@/features/clients/model/clients.ui-tokens'

export interface ClientsListHeaderProps {
  onCreateClient: () => void
  className?: string
  title?: string
  subtitle?: string
}

export function ClientsListHeader({
  onCreateClient,
  className,
  title = 'Todos los clientes',
  subtitle = 'Lista completa de clientes registrados en el sistema',
}: ClientsListHeaderProps) {
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
            onClick={onCreateClient}
            className={CLIENTS_PRIMARY_ACTION_BUTTON_CLASSNAME}
          >
            <Plus />
            Nuevo cliente
          </Button>
        </PageHeaderActionGroup>
      }
    />
  )
}
