import { useCallback, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useRouter } from '@tanstack/react-router'
import { useNewClaimForm } from '@/features/claims/hooks/use-new-claim-form'
import { NewClaimHeader } from '@/features/claims/components/new/new-claim-header'
import { ClaimDataCard } from '@/features/claims/components/new/claim-data-card'
import { ClaimDescriptionCard } from '@/features/claims/components/new/claim-description-card'
import { ClaimDocumentsCard } from '@/features/claims/components/new/claim-documents-card'
import { ClaimTipsCard } from '@/features/claims/components/new/claim-tips-card'
import { SubmitClaimConfirmDialog } from '@/features/claims/components/new/submit-claim-confirm-dialog'
import { DEFAULT_CLAIMS_LIST_SEARCH } from '@/features/claims/claims-list-search'

export const Route = createFileRoute('/_authenticated/reclamos/nuevo')({
  component: NuevoReclamoPage,
})

function NuevoReclamoPage() {
  const form = useNewClaimForm()
  const router = useRouter()
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)

  const handleConfirmOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (form.isSubmitting && !nextOpen) return
      setIsConfirmOpen(nextOpen)
    },
    [form.isSubmitting],
  )

  async function handleConfirmSubmit() {
    await form.handleSubmit()
  }

  return (
    <>
      <NewClaimHeader
        onCancel={() =>
          void router.navigate({
            to: '/reclamos',
            search: DEFAULT_CLAIMS_LIST_SEARCH,
          })
        }
        onSubmit={() => setIsConfirmOpen(true)}
        canSubmit={form.canSubmit}
        isSubmitting={form.isSubmitting}
      />
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8 xl:px-8">
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2 xl:gap-8">
          <ClaimDataCard {...form.dataCardProps} />
          <ClaimDescriptionCard {...form.descriptionCardProps} />
          <ClaimDocumentsCard />
          <ClaimTipsCard />
        </div>
      </div>
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
