import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/shared/ui/primitives/card'
import type { InsurerDetailSummaryItem } from '@/features/insurers/detail/controller/use-insurer-detail-main-controller'

export interface InsurerDetailSummaryCardProps {
  items: InsurerDetailSummaryItem[]
}

export function InsurerDetailSummaryCard({
  items,
}: InsurerDetailSummaryCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-[var(--color-gray-900)]">Resumen</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
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
      </CardContent>
    </Card>
  )
}
