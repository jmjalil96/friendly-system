import * as React from 'react'
import { Tabs as TabsPrimitive } from 'radix-ui'

import { cn } from '@/shared/lib/cn'

function ViewTabsRoot({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="view-tabs"
      className={cn('w-full', className)}
      {...props}
    />
  )
}

function ViewTabsList({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="view-tabs-list"
      className={cn(
        'flex w-full items-end gap-0 overflow-x-auto border-b border-[var(--color-gray-200)]',
        '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
        className,
      )}
      {...props}
    />
  )
}

function ViewTabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="view-tabs-trigger"
      className={cn(
        'relative inline-flex shrink-0 items-center justify-center gap-1.5 px-3 pb-2.5 pt-2 text-sm font-medium text-[var(--color-gray-500)] transition-colors sm:px-4',
        'hover:text-[var(--color-gray-700)]',
        'focus-visible:outline-none focus-visible:text-[var(--color-blue-700)]',
        /* Active: blue bottom border + text */
        'data-[state=active]:text-[var(--color-blue-700)]',
        'after:absolute after:inset-x-0 after:bottom-0 after:h-[2px] after:scale-x-0 after:bg-[var(--color-blue-700)] after:transition-transform after:duration-200',
        'data-[state=active]:after:scale-x-100',
        className,
      )}
      {...props}
    />
  )
}

function ViewTabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="view-tabs-content"
      className={cn(
        'mt-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-blue-500)]/30',
        className,
      )}
      {...props}
    />
  )
}

const ViewTabs = Object.assign(ViewTabsRoot, {
  List: ViewTabsList,
  Trigger: ViewTabsTrigger,
  Content: ViewTabsContent,
})

export { ViewTabs }
