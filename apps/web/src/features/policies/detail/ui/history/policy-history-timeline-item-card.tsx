import { cn } from '@/shared/lib/cn'

export interface PolicyHistoryTimelineItemCardProps {
  actionLabel: string
  actionToneClassName: string
  createdAtLabel: string
  userLabel: string
  metadataLines: string[]
}

export function PolicyHistoryTimelineItemCard({
  actionLabel,
  actionToneClassName,
  createdAtLabel,
  userLabel,
  metadataLines,
}: PolicyHistoryTimelineItemCardProps) {
  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--color-gray-200)] bg-white px-3 py-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={cn(
            'inline-flex items-center rounded-full px-2 py-0.5 text-[0.7rem] font-semibold',
            actionToneClassName,
          )}
        >
          {actionLabel}
        </span>
      </div>

      <p className="mt-1 text-xs text-[var(--color-gray-500)]">
        {createdAtLabel} · {userLabel}
      </p>

      <div className="mt-2 space-y-1">
        {metadataLines.map((line, index) => (
          <p key={index} className="text-xs text-[var(--color-gray-700)]">
            {line}
          </p>
        ))}
      </div>
    </div>
  )
}
