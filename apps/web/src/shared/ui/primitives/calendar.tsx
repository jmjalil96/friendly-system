import * as React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { DayPicker } from 'react-day-picker'
import { cn } from '@/shared/lib/cn'
import { buttonVariants } from '@/shared/ui/primitives/button'

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn('p-3', className)}
      classNames={{
        root: 'w-fit',
        months: 'flex flex-col sm:flex-row gap-2',
        month: 'flex flex-col gap-4',
        month_caption: 'flex items-center justify-center relative pt-1',
        caption_label: 'text-sm font-medium',
        nav: 'flex items-center gap-1',
        button_previous: cn(
          buttonVariants({ variant: 'outline' }),
          'size-7 bg-transparent p-0 opacity-60 hover:opacity-100',
        ),
        button_next: cn(
          buttonVariants({ variant: 'outline' }),
          'size-7 bg-transparent p-0 opacity-60 hover:opacity-100',
        ),
        month_grid: 'w-full border-collapse space-y-1',
        weekdays: 'flex',
        weekday:
          'text-[var(--color-gray-500)] rounded-md w-8 font-normal text-[0.8rem]',
        week: 'mt-1 flex w-full',
        day: 'size-8 p-0 text-center text-sm',
        day_button: cn(
          buttonVariants({ variant: 'ghost' }),
          'size-8 p-0 font-normal aria-selected:opacity-100',
        ),
        selected:
          'bg-[var(--color-blue-600)] text-white hover:bg-[var(--color-blue-600)] hover:text-white focus:bg-[var(--color-blue-600)] focus:text-white',
        today:
          'bg-[var(--color-blue-100)] text-[var(--color-blue-900)] font-semibold',
        outside: 'text-[var(--color-gray-400)] opacity-60',
        disabled: 'text-[var(--color-gray-400)] opacity-40',
        hidden: 'invisible',
        ...classNames,
      }}
      components={{
        Chevron: ({
          orientation,
          className: chevronClassName,
          ...chevronProps
        }) =>
          orientation === 'left' ? (
            <ChevronLeft
              className={cn('size-4', chevronClassName)}
              {...chevronProps}
            />
          ) : (
            <ChevronRight
              className={cn('size-4', chevronClassName)}
              {...chevronProps}
            />
          ),
      }}
      {...props}
    />
  )
}

export { Calendar }
