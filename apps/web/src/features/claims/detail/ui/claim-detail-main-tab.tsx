import { AlertTriangle, RefreshCw } from 'lucide-react'
import type { GetClaimByIdResponse } from '@friendly-system/shared'
import { Button } from '@/shared/ui/primitives/button'
import { Card, CardContent, CardHeader } from '@/shared/ui/primitives/card'
import { Skeleton } from '@/shared/ui/primitives/skeleton'
import { useClaimDetailMainController } from '@/features/claims/detail/controller/use-claim-detail-main-controller'
import { useClaimWorkflowController } from '@/features/claims/detail/controller/use-claim-workflow-controller'
import { CLAIMS_ERROR_PANEL_CLASSNAME } from '@/features/claims/model/claims.ui-tokens'
import { ClaimWorkflowCard } from '@/features/claims/detail/ui/workflow/claim-workflow-card'
import { ClaimDetailMainLayout } from './claim-detail-main-layout'
import { ClaimDetailMainSections } from './claim-detail-main-sections'
import { ClaimDetailSummaryCard } from './claim-detail-summary-card'

export interface ClaimDetailMainTabProps {
  claimId: string
  claim?: GetClaimByIdResponse
  isLoading: boolean
  isError: boolean
  onRetry: () => void | Promise<void>
}

function ClaimDetailMainSkeleton() {
  return (
    <div className="grid gap-6 xl:grid-cols-12">
      <div className="space-y-6 xl:col-span-8">
        {Array.from({ length: 3 }).map((_, index) => (
          <Card key={index} className="overflow-hidden">
            <div className="h-[2px] bg-[var(--color-gray-100)]" />
            <CardHeader>
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-64" />
            </CardHeader>
            <CardContent>
              <div className="grid gap-1 md:grid-cols-2">
                {Array.from({ length: 4 }).map((__, itemIndex) => (
                  <Skeleton
                    key={itemIndex}
                    className="h-16 w-full rounded-[var(--radius-md)]"
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="space-y-6 xl:col-span-4">
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-24" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-14 w-full rounded-lg" />
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-10 w-full" />
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent className="space-y-2">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-9 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function ClaimDetailMainError({
  onRetry,
}: Pick<ClaimDetailMainTabProps, 'onRetry'>) {
  return (
    <div className={CLAIMS_ERROR_PANEL_CLASSNAME}>
      <div className="flex items-start gap-3">
        <span className="mt-0.5 rounded-lg bg-white p-2 text-[var(--color-red-600)] shadow-sm ring-1 ring-[var(--color-red-200)]">
          <AlertTriangle className="size-4" />
        </span>
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-[var(--color-gray-900)]">
            No pudimos cargar la vista general
          </h3>
          <p className="text-sm text-[var(--color-gray-600)]">
            Ocurrió un error al obtener el detalle del reclamo.
          </p>
        </div>
      </div>
      <div className="mt-4">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void onRetry()}
        >
          <RefreshCw className="size-3.5" />
          Reintentar
        </Button>
      </div>
    </div>
  )
}

export function ClaimDetailMainTab({
  claimId,
  claim,
  isLoading,
  isError,
  onRetry,
}: ClaimDetailMainTabProps) {
  const view = useClaimDetailMainController({ claimId, claim })
  const workflow = useClaimWorkflowController({ claimId, claim })

  if (isLoading) return <ClaimDetailMainSkeleton />
  if (isError) return <ClaimDetailMainError onRetry={onRetry} />

  if (!claim) {
    return (
      <div className="rounded-xl border border-[var(--color-gray-200)] bg-white p-6 text-sm text-[var(--color-gray-600)]">
        No encontramos datos del reclamo.
      </div>
    )
  }

  return (
    <ClaimDetailMainLayout
      sections={<ClaimDetailMainSections sections={view.sections} />}
      sidebar={
        <>
          <ClaimDetailSummaryCard
            statusLabel={view.summary.statusLabel}
            statusClassName={view.summary.statusClassName}
            items={view.summary.items}
          />
          <ClaimWorkflowCard
            fromStatus={claim.status}
            steps={workflow.steps}
            actions={workflow.actions}
            dialog={workflow.dialog}
            onActionSelect={workflow.onActionSelect}
            onDialogOpenChange={workflow.onDialogOpenChange}
            onReasonChange={workflow.onReasonChange}
            onNotesChange={workflow.onNotesChange}
            onSubmitTransition={workflow.onSubmitTransition}
          />
        </>
      }
    />
  )
}
