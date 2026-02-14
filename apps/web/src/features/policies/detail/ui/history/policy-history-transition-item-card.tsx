export interface PolicyHistoryTransitionItemCardProps {
  fromStatusLabel: string
  toStatusLabel: string
  createdAtLabel: string
  createdByLabel: string
  reason?: string
  notes?: string
}

export function PolicyHistoryTransitionItemCard({
  fromStatusLabel,
  toStatusLabel,
  createdAtLabel,
  createdByLabel,
  reason,
  notes,
}: PolicyHistoryTransitionItemCardProps) {
  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--color-gray-200)] bg-white px-3 py-2.5">
      <p className="text-sm font-semibold text-[var(--color-gray-900)]">
        {fromStatusLabel}
        {' -> '}
        {toStatusLabel}
      </p>

      <p className="mt-1 text-xs text-[var(--color-gray-500)]">
        {createdAtLabel} · {createdByLabel}
      </p>

      {reason ? (
        <p className="mt-2 text-xs text-[var(--color-gray-700)]">
          <span className="font-semibold">Motivo:</span> {reason}
        </p>
      ) : null}

      {notes ? (
        <p className="mt-1 text-xs text-[var(--color-gray-600)]">
          <span className="font-semibold">Notas:</span> {notes}
        </p>
      ) : null}
    </div>
  )
}
