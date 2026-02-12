import { PageHeader } from '@/shared/ui/composites/page-header'

export interface ClaimDetailHeaderProps {
  subtitle: string
  onBack: () => void
  className?: string
}

export function ClaimDetailHeader({
  subtitle,
  onBack,
  className,
}: ClaimDetailHeaderProps) {
  return (
    <PageHeader
      className={className}
      stickyMode="desktop"
      title="Detalle del reclamo"
      subtitle={subtitle}
      onBack={onBack}
      backLabel="Volver a la lista"
    />
  )
}
