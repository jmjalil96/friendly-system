import * as React from 'react'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/shared/ui/primitives/button'
import { cn } from '@/shared/lib/cn'

/* ————————————————————————————————————————————
 * PageHeaderActionGroup
 * Wrap each logical group of actions in this.
 * Adjacent groups get a vertical separator via CSS.
 * ———————————————————————————————————————————— */

function PageHeaderActionGroup({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="page-header-action-group"
      className={cn('flex items-center gap-2', className)}
      {...props}
    />
  )
}

/* ————————————————————————————————————————————
 * PageHeader
 * ———————————————————————————————————————————— */

interface PageHeaderProps extends React.ComponentProps<'div'> {
  title: string
  subtitle?: string
  onBack?: () => void
  backLabel?: string
  actions?: React.ReactNode
  stickyMode?: 'always' | 'desktop' | 'none'
}

const PAGE_HEADER_STICKY_CLASSNAMES = {
  always: 'sticky top-0 z-10',
  desktop: 'lg:sticky lg:top-0 lg:z-10',
  none: 'static z-auto',
} as const

function PageHeader({
  title,
  subtitle,
  onBack,
  backLabel,
  actions,
  stickyMode = 'always',
  className,
  ...props
}: PageHeaderProps) {
  return (
    <div
      data-slot="page-header"
      className={cn(
        PAGE_HEADER_STICKY_CLASSNAMES[stickyMode],
        'bg-white shadow-[0_1px_3px_rgba(0,0,0,0.05)]',
        className,
      )}
      {...props}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:gap-4 sm:px-6 sm:py-4">
        {/* ── Left: back + title ── */}
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          {onBack && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="shrink-0 text-[var(--color-gray-500)] hover:text-[var(--color-gray-900)]"
            >
              <ArrowLeft />
              <span className="hidden sm:inline">
                {backLabel ?? 'Volver'}
              </span>
            </Button>
          )}

          <div
            className={cn(
              'min-w-0',
              onBack &&
                'border-l border-[var(--color-gray-200)] pl-3 sm:pl-4',
            )}
          >
            <h1 className="truncate text-base font-bold tracking-tight text-[var(--color-gray-900)] sm:text-lg">
              {title}
            </h1>
            {subtitle && (
              <p className="hidden text-[0.8rem] text-[var(--color-gray-500)] sm:block">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {/* ── Right: action slots ── */}
        {actions && (
          <div
            data-slot="page-header-actions"
            className={cn(
              'flex max-w-full flex-wrap items-center justify-end gap-3 sm:flex-nowrap',
              /* Auto-separator between adjacent action groups */
              '[&>[data-slot=page-header-action-group]+[data-slot=page-header-action-group]]:border-l',
              '[&>[data-slot=page-header-action-group]+[data-slot=page-header-action-group]]:border-[var(--color-gray-200)]',
              '[&>[data-slot=page-header-action-group]+[data-slot=page-header-action-group]]:pl-3',
            )}
          >
            {actions}
          </div>
        )}
      </div>

      {/* ── Signature gradient bar ── */}
      <div className="h-[2px] bg-gradient-to-r from-[var(--color-blue-700)] via-[var(--color-blue-500)] to-[var(--color-red-500)]" />
    </div>
  )
}

export { PageHeader, PageHeaderActionGroup }
