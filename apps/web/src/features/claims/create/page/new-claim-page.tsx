import { useCallback, useState } from 'react'
import { ClaimDataCard } from '@/features/claims/create/ui/claim-data-card'
import { ClaimDescriptionCard } from '@/features/claims/create/ui/claim-description-card'
import { ClaimDocumentsCard } from '@/features/claims/create/ui/claim-documents-card'
import { ClaimTipsCard } from '@/features/claims/create/ui/claim-tips-card'
import { NewClaimHeader } from '@/features/claims/create/ui/new-claim-header'
import { SubmitClaimConfirmDialog } from '@/features/claims/create/ui/submit-claim-confirm-dialog'
import { useNewClaimController } from '@/features/claims/create/controller/use-new-claim-controller'
import { CLAIMS_PAGE_CONTAINER_CLASSNAME } from '@/features/claims/model/claims.ui-tokens'
import {
  Card,
  CardContent,
  CardHeader,
} from '@/shared/ui/primitives/card'
import { Skeleton } from '@/shared/ui/primitives/skeleton'

interface NewClaimPageProps {
  onCancel: () => void
  onCreated: (claimId: string) => void
}

function NewClaimPageSkeleton() {
  return (
    <div className={CLAIMS_PAGE_CONTAINER_CLASSNAME}>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-8">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index}>
            <CardHeader className="space-y-2">
              <Skeleton className="h-5 w-44" />
              <Skeleton className="h-4 w-64" />
            </CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

export function NewClaimPage({ onCancel, onCreated }: NewClaimPageProps) {
  const form = useNewClaimController()
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)

  const handleConfirmOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (form.isSubmitting && !nextOpen) return
      setIsConfirmOpen(nextOpen)
    },
    [form.isSubmitting],
  )

  const handleConfirmSubmit = useCallback(async () => {
    const claimId = await form.handleSubmit()
    if (!claimId) return

    onCreated(claimId)
  }, [form, onCreated])

  return (
    <>
      <NewClaimHeader
        onCancel={onCancel}
        onSubmit={() => setIsConfirmOpen(true)}
        canSubmit={form.canSubmit}
        isSubmitting={form.isSubmitting}
      />
      {form.isBootstrapping ? (
        <NewClaimPageSkeleton />
      ) : (
        <div className={CLAIMS_PAGE_CONTAINER_CLASSNAME}>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-8">
            <ClaimDataCard {...form.dataCardProps} />
            <ClaimDescriptionCard {...form.descriptionCardProps} />
            <ClaimDocumentsCard />
            <ClaimTipsCard />
          </div>
        </div>
      )}
      <SubmitClaimConfirmDialog
        open={isConfirmOpen}
        onOpenChange={handleConfirmOpenChange}
        onConfirm={handleConfirmSubmit}
        canSubmit={form.canSubmit}
        isSubmitting={form.isSubmitting}
      />
    </>
  )
}
