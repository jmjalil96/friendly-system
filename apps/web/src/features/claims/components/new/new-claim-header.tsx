import { Loader2, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  PageHeader,
  PageHeaderActionGroup,
} from '@/components/ui/page-header'

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
            className="bg-[var(--color-red-500)] text-white shadow-sm hover:bg-[var(--color-red-700)]"
          >
            {isSubmitting ? <Loader2 className="animate-spin" /> : <Plus />}
            {isSubmitting ? 'Creando...' : 'Crear reclamo'}
          </Button>
        </PageHeaderActionGroup>
      }
    />
  )
}
