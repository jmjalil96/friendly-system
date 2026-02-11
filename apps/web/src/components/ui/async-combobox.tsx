import * as React from 'react'
import { Check, ChevronsUpDown, Loader2 } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'

interface AsyncComboboxProps<T> {
  value: string
  onValueChange: (value: string) => void
  options: T[]
  getOptionValue: (option: T) => string
  getOptionLabel: (option: T) => string

  searchQuery: string
  onSearchChange: (query: string) => void

  isLoading?: boolean
  disabled?: boolean
  placeholder?: string
  searchPlaceholder?: string
  emptyMessage?: string
  className?: string
}

function AsyncCombobox<T>({
  value,
  onValueChange,
  options,
  getOptionValue,
  getOptionLabel,
  searchQuery,
  onSearchChange,
  isLoading = false,
  disabled = false,
  placeholder = 'Seleccionar...',
  searchPlaceholder = 'Buscar...',
  emptyMessage = 'Sin resultados.',
  className,
}: AsyncComboboxProps<T>) {
  const [open, setOpen] = React.useState(false)

  const selectedLabel = React.useMemo(() => {
    if (!value) return null
    const selected = options.find((o) => getOptionValue(o) === value)
    return selected ? getOptionLabel(selected) : null
  }, [value, options, getOptionValue, getOptionLabel])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          data-slot="async-combobox"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            'h-9 w-full justify-between font-normal',
            !selectedLabel && 'text-muted-foreground',
            className,
          )}
        >
          <span className="truncate">
            {selectedLabel ?? placeholder}
          </span>
          <ChevronsUpDown className="opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={searchPlaceholder}
            value={searchQuery}
            onValueChange={onSearchChange}
          />
          <CommandList>
            {isLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="size-4 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <CommandEmpty>{emptyMessage}</CommandEmpty>
                <CommandGroup>
                  {options.map((option) => {
                    const optionValue = getOptionValue(option)
                    const optionLabel = getOptionLabel(option)
                    const isSelected = optionValue === value

                    return (
                      <CommandItem
                        key={optionValue}
                        value={optionValue}
                        onSelect={() => {
                          onValueChange(isSelected ? '' : optionValue)
                          setOpen(false)
                        }}
                      >
                        <Check
                          className={cn(
                            'size-4',
                            isSelected ? 'opacity-100' : 'opacity-0',
                          )}
                        />
                        {optionLabel}
                      </CommandItem>
                    )
                  })}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

export { AsyncCombobox, type AsyncComboboxProps }
