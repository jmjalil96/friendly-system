import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/shared/ui/primitives/card'
import { cn } from '@/shared/lib/cn'
import type { PolicyDetailSummaryItem } from '@/features/policies/detail/controller/use-policy-detail-main-controller'

export interface PolicyDetailSummaryCardProps {
  statusLabel?: string
  statusClassName?: string
  items: PolicyDetailSummaryItem[]
}

export function PolicyDetailSummaryCard({
  statusLabel,
  statusClassName,
  items,
}: PolicyDetailSummaryCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-[var(--color-gray-900)]">Resumen</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {statusLabel ? (
          <div className="flex items-center gap-3 rounded-lg bg-[var(--color-gray-50)] px-3.5 py-3">
            <div className="flex-1">
              <p className="text-[0.68rem] font-semibold tracking-wide text-[var(--color-gray-500)] uppercase">
                Estado actual
              </p>
              <span
                className={cn(
                  'mt-1.5 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
                  statusClassName,
                )}
              >
                {statusLabel}
              </span>
            </div>
          </div>
        ) : null}

        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item.label}
              className="border-b border-[var(--color-gray-100)] pb-3 last:border-0 last:pb-0"
            >
              <p className="text-[0.68rem] font-semibold tracking-wide text-[var(--color-gray-500)] uppercase">
                {item.label}
              </p>
              <p className="mt-0.5 break-all text-sm font-medium text-[var(--color-gray-900)]">
                {item.value}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
