import { Loader2, Plus } from 'lucide-react'
import { Button } from '@/shared/ui/primitives/button'
import {
  PageHeader,
  PageHeaderActionGroup,
} from '@/shared/ui/composites/page-header'
import { CLAIMS_PRIMARY_ACTION_BUTTON_CLASSNAME } from '@/features/claims/model/claims.ui-tokens'

interface NewClaimHeaderProps {
  onCancel: () => void
  onSubmit: () => void
  canSubmit: boolean
  isSubmitting: boolean
}

export function NewClaimHeader({
  onCancel,
  onSubmit,
  canSubmit,
  isSubmitting,
}: NewClaimHeaderProps) {
  return (
    <PageHeader
      stickyMode="desktop"
      title="Nuevo reclamo"
      subtitle="Completa los datos para crear un nuevo reclamo"
      onBack={onCancel}
      backLabel="Cancelar"
      actions={
        <PageHeaderActionGroup>
          <Button
            size="sm"
            onClick={onSubmit}
            disabled={!canSubmit}
            className={CLAIMS_PRIMARY_ACTION_BUTTON_CLASSNAME}
          >
            {isSubmitting ? <Loader2 className="animate-spin" /> : <Plus />}
            {isSubmitting ? 'Creando...' : 'Crear reclamo'}
          </Button>
        </PageHeaderActionGroup>
      }
    />
  )
}
