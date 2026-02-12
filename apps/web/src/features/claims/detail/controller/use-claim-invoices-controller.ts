import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  createClaimInvoiceSchema,
  updateClaimInvoiceSchema,
  type ClaimInvoicesResponse,
} from '@friendly-system/shared'
import { toast } from '@/shared/hooks/use-toast'
import {
  useClaimInvoices,
  useCreateClaimInvoice,
  useDeleteClaimInvoice,
  useUpdateClaimInvoice,
} from '@/features/claims/api/claims.hooks'

type ClaimInvoiceItem = ClaimInvoicesResponse['data'][number]
type InvoiceDialogMode = 'create' | 'edit'

interface InvoiceDraft {
  invoiceNumber: string
  providerName: string
  amountSubmitted: string
}

function makeEmptyDraft(): InvoiceDraft {
  return {
    invoiceNumber: '',
    providerName: '',
    amountSubmitted: '',
  }
}

function draftFromInvoice(invoice: ClaimInvoiceItem): InvoiceDraft {
  return {
    invoiceNumber: invoice.invoiceNumber,
    providerName: invoice.providerName,
    amountSubmitted: invoice.amountSubmitted,
  }
}

function normalizeDraft(draft: InvoiceDraft): InvoiceDraft {
  return {
    invoiceNumber: draft.invoiceNumber.trim(),
    providerName: draft.providerName.trim(),
    amountSubmitted: draft.amountSubmitted.trim().replace(/,/g, '.'),
  }
}

function canonicalDecimal(value: string): string {
  const normalized = value.trim().replace(/,/g, '.')
  const match = /^(\d+)(?:\.(\d+))?$/.exec(normalized)
  if (!match) return normalized

  const integerPart = match[1]?.replace(/^0+(?=\d)/, '') ?? '0'
  const fractionalPart = (match[2] ?? '').replace(/0+$/, '')

  return fractionalPart ? `${integerPart}.${fractionalPart}` : integerPart
}

function buildInvoicePatch(
  current: ClaimInvoiceItem,
  next: InvoiceDraft,
) {
  const currentInvoiceNumber = current.invoiceNumber.trim()
  const currentProviderName = current.providerName.trim()
  const currentAmount = canonicalDecimal(current.amountSubmitted)
  const nextAmount = canonicalDecimal(next.amountSubmitted)

  const patch: {
    invoiceNumber?: string
    providerName?: string
    amountSubmitted?: string
  } = {}

  if (next.invoiceNumber !== currentInvoiceNumber) {
    patch.invoiceNumber = next.invoiceNumber
  }

  if (next.providerName !== currentProviderName) {
    patch.providerName = next.providerName
  }

  if (nextAmount !== currentAmount) {
    patch.amountSubmitted = next.amountSubmitted
  }

  return patch
}

const INVOICE_PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const
const DEFAULT_INVOICE_PAGE_SIZE = 20
const DEFAULT_INVOICE_PAGE = 1

export interface UseClaimInvoicesControllerParams {
  claimId: string
}

export interface UseClaimInvoicesControllerResult {
  list: {
    invoices: ClaimInvoiceItem[]
    isLoading: boolean
    isError: boolean
    onRetry: () => void
  }
  pagination: {
    page: number
    limit: number
    limitOptions: readonly number[]
    totalCount: number
    totalPages: number
    onFirstPage: () => void
    onPreviousPage: () => void
    onNextPage: () => void
    onLastPage: () => void
    onLimitChange: (value: number) => void
  }
  formDialog: {
    open: boolean
    mode: InvoiceDialogMode
    draft: InvoiceDraft
    error?: string
    isSubmitting: boolean
    onOpenCreate: () => void
    onOpenEdit: (invoiceId: string) => void
    onOpenChange: (open: boolean) => void
    onFieldChange: (field: keyof InvoiceDraft, value: string) => void
    onSubmit: () => Promise<void>
  }
  deleteDialog: {
    open: boolean
    invoice?: ClaimInvoiceItem
    isDeleting: boolean
    onOpenDelete: (invoiceId: string) => void
    onOpenChange: (open: boolean) => void
    onConfirmDelete: () => Promise<void>
  }
}

export function useClaimInvoicesController({
  claimId,
}: UseClaimInvoicesControllerParams): UseClaimInvoicesControllerResult {
  const [page, setPage] = useState(DEFAULT_INVOICE_PAGE)
  const [limit, setLimit] = useState(DEFAULT_INVOICE_PAGE_SIZE)

  const invoiceQuery = useClaimInvoices(claimId, { page, limit })
  const { createInvoice, createInvoiceStatus } = useCreateClaimInvoice(claimId)
  const { updateInvoice, updateInvoiceStatus } = useUpdateClaimInvoice(claimId)
  const { deleteInvoice, deleteInvoiceStatus } = useDeleteClaimInvoice(claimId)

  const [formOpen, setFormOpen] = useState(false)
  const [formMode, setFormMode] = useState<InvoiceDialogMode>('create')
  const [activeInvoiceId, setActiveInvoiceId] = useState<string>()
  const [draft, setDraft] = useState<InvoiceDraft>(makeEmptyDraft())
  const [formError, setFormError] = useState<string>()

  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteInvoiceId, setDeleteInvoiceId] = useState<string>()

  useEffect(() => {
    setPage(DEFAULT_INVOICE_PAGE)
    setLimit(DEFAULT_INVOICE_PAGE_SIZE)
    setFormOpen(false)
    setFormMode('create')
    setActiveInvoiceId(undefined)
    setDraft(makeEmptyDraft())
    setFormError(undefined)
    setDeleteOpen(false)
    setDeleteInvoiceId(undefined)
  }, [claimId])

  const invoices = invoiceQuery.data?.data ?? []
  const meta = invoiceQuery.data?.meta
  const totalCount = meta?.totalCount ?? 0
  const totalPages = Math.max(1, meta?.totalPages ?? 1)

  useEffect(() => {
    if (page <= totalPages) return
    setPage(totalPages)
  }, [page, totalPages])

  const activeInvoice = useMemo(
    () => invoices.find((invoice) => invoice.id === activeInvoiceId),
    [activeInvoiceId, invoices],
  )

  const selectedDeleteInvoice = useMemo(
    () => invoices.find((invoice) => invoice.id === deleteInvoiceId),
    [deleteInvoiceId, invoices],
  )

  const isFormSubmitting =
    createInvoiceStatus === 'pending' || updateInvoiceStatus === 'pending'
  const isDeleting = deleteInvoiceStatus === 'pending'

  const resetFormState = useCallback(() => {
    setFormOpen(false)
    setFormMode('create')
    setActiveInvoiceId(undefined)
    setDraft(makeEmptyDraft())
    setFormError(undefined)
  }, [])

  const resetDeleteState = useCallback(() => {
    setDeleteOpen(false)
    setDeleteInvoiceId(undefined)
  }, [])

  const onRetry = useCallback(() => {
    void invoiceQuery.refetch()
  }, [invoiceQuery.refetch])

  const onOpenCreate = useCallback(() => {
    setFormMode('create')
    setFormOpen(true)
    setActiveInvoiceId(undefined)
    setDraft(makeEmptyDraft())
    setFormError(undefined)
  }, [])

  const onOpenEdit = useCallback(
    (invoiceId: string) => {
      const target = invoices.find((item) => item.id === invoiceId)
      if (!target) return

      setFormMode('edit')
      setFormOpen(true)
      setActiveInvoiceId(invoiceId)
      setDraft(draftFromInvoice(target))
      setFormError(undefined)
    },
    [invoices],
  )

  const onFormOpenChange = useCallback((open: boolean) => {
    if (isFormSubmitting && !open) return

    if (!open) {
      resetFormState()
      return
    }

    setFormOpen(true)
  }, [isFormSubmitting, resetFormState])

  const onFieldChange = useCallback((field: keyof InvoiceDraft, value: string) => {
    setDraft((previous) => ({ ...previous, [field]: value }))
    if (formError) setFormError(undefined)
  }, [formError])

  const onSubmit = useCallback(async () => {
    if (isFormSubmitting) return

    const normalized = normalizeDraft(draft)

    if (formMode === 'create') {
      const parsed = createClaimInvoiceSchema.safeParse(normalized)
      if (!parsed.success) {
        setFormError(parsed.error.issues[0]?.message ?? 'Valores inválidos')
        return
      }

      try {
        await createInvoice(parsed.data)
        toast.success('Factura creada')
        setPage(DEFAULT_INVOICE_PAGE)
        resetFormState()
      } catch {
        // API errors are already surfaced via global toast in api.ts.
      }

      return
    }

    if (!activeInvoice) {
      setFormError('No encontramos la factura seleccionada.')
      return
    }

    const candidatePatch = buildInvoicePatch(activeInvoice, normalized)
    if (Object.keys(candidatePatch).length === 0) {
      resetFormState()
      return
    }

    const parsed = updateClaimInvoiceSchema.safeParse(candidatePatch)
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message ?? 'Valores inválidos')
      return
    }

    try {
      await updateInvoice({
        invoiceId: activeInvoice.id,
        input: parsed.data,
      })
      toast.success('Factura actualizada')
      resetFormState()
    } catch {
      // API errors are already surfaced via global toast in api.ts.
    }
  }, [
    activeInvoice,
    createInvoice,
    draft,
    formMode,
    isFormSubmitting,
    resetFormState,
    updateInvoice,
  ])

  const onOpenDelete = useCallback((invoiceId: string) => {
    setDeleteInvoiceId(invoiceId)
    setDeleteOpen(true)
  }, [])

  const onDeleteOpenChange = useCallback((open: boolean) => {
    if (isDeleting && !open) return

    if (!open) {
      resetDeleteState()
      return
    }

    setDeleteOpen(true)
  }, [isDeleting, resetDeleteState])

  const onConfirmDelete = useCallback(async () => {
    if (!deleteInvoiceId || isDeleting) return

    try {
      await deleteInvoice(deleteInvoiceId)
      toast.success('Factura eliminada')
      resetDeleteState()
    } catch {
      // API errors are already surfaced via global toast in api.ts.
    }
  }, [deleteInvoice, deleteInvoiceId, isDeleting, resetDeleteState])

  const onFirstPage = useCallback(() => {
    setPage(1)
  }, [])

  const onPreviousPage = useCallback(() => {
    setPage((previous) => Math.max(1, previous - 1))
  }, [])

  const onNextPage = useCallback(() => {
    setPage((previous) => Math.min(totalPages, previous + 1))
  }, [totalPages])

  const onLastPage = useCallback(() => {
    setPage(totalPages)
  }, [totalPages])

  const onLimitChange = useCallback((value: number) => {
    if (!INVOICE_PAGE_SIZE_OPTIONS.includes(value as (typeof INVOICE_PAGE_SIZE_OPTIONS)[number])) {
      return
    }

    setLimit(value)
    setPage(1)
  }, [])

  return {
    list: {
      invoices,
      isLoading: invoiceQuery.isLoading,
      isError: invoiceQuery.isError,
      onRetry,
    },
    pagination: {
      page,
      limit,
      limitOptions: INVOICE_PAGE_SIZE_OPTIONS,
      totalCount,
      totalPages,
      onFirstPage,
      onPreviousPage,
      onNextPage,
      onLastPage,
      onLimitChange,
    },
    formDialog: {
      open: formOpen,
      mode: formMode,
      draft,
      error: formError,
      isSubmitting: isFormSubmitting,
      onOpenCreate,
      onOpenEdit,
      onOpenChange: onFormOpenChange,
      onFieldChange,
      onSubmit,
    },
    deleteDialog: {
      open: deleteOpen,
      invoice: selectedDeleteInvoice,
      isDeleting,
      onOpenDelete,
      onOpenChange: onDeleteOpenChange,
      onConfirmDelete,
    },
  }
}
