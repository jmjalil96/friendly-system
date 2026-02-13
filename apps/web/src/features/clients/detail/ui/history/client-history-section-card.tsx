import type { ReactNode } from 'react'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/ui/primitives/card'

export interface ClientHistorySectionCardProps {
  title: string
  subtitle: string
  action?: ReactNode
  children: ReactNode
}

export function ClientHistorySectionCard({
  title,
  subtitle,
  action,
  children,
}: ClientHistorySectionCardProps) {
  return (
    <Card className="overflow-hidden">
      <div className="h-[2px] bg-gradient-to-r from-[var(--color-blue-700)] to-[var(--color-blue-500)]" />
      <CardHeader>
        <CardTitle className="text-[var(--color-gray-900)]">{title}</CardTitle>
        <CardDescription>{subtitle}</CardDescription>
        {action ? <CardAction>{action}</CardAction> : null}
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  )
}
