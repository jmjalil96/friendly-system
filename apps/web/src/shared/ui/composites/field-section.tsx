import type { ReactNode } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/ui/primitives/card'
import { cn } from '@/shared/lib/cn'

export interface FieldSectionProps {
  title: string
  subtitle?: string
  children: ReactNode
  className?: string
}

export function FieldSection({
  title,
  subtitle,
  children,
  className,
}: FieldSectionProps) {
  return (
    <Card className={cn('overflow-hidden', className)}>
      <div className="h-[2px] bg-gradient-to-r from-[var(--color-blue-700)] to-[var(--color-blue-500)]" />
      <CardHeader>
        <CardTitle className="text-[var(--color-gray-900)]">{title}</CardTitle>
        {subtitle ? (
          <CardDescription className="text-[var(--color-gray-500)]">
            {subtitle}
          </CardDescription>
        ) : null}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}
