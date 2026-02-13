import { ChevronDown, Loader2, UserX } from 'lucide-react'
import { Button } from '@/shared/ui/primitives/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/ui/primitives/dropdown-menu'

export interface ClientDetailHeaderActionsProps {
  disabled: boolean
  isDeactivating: boolean
  onDeactivateRequest: () => void
}

export function ClientDetailHeaderActions({
  disabled,
  isDeactivating,
  onDeactivateRequest,
}: ClientDetailHeaderActionsProps) {
  const isActionDisabled = disabled || isDeactivating

  return (
    <DropdownMenu>
      <div className="rounded-[10px] bg-gradient-to-r from-[var(--color-blue-700)] via-[var(--color-blue-500)] to-[var(--color-red-500)] p-0.5">
        <div
          role="group"
          className="flex overflow-hidden rounded-[8px] bg-white"
        >
          <Button
            type="button"
            variant="ghost"
            className="h-10 rounded-none border-none px-2.5 text-sm font-medium text-[var(--color-gray-700)] shadow-none hover:bg-[var(--color-gray-50)] hover:text-[var(--color-red-600)] sm:px-4"
            disabled={isActionDisabled}
            aria-label="Desactivar cliente"
            onClick={onDeactivateRequest}
          >
            {isDeactivating ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <UserX className="size-4 text-[var(--color-red-500)]" />
            )}
            <span className="hidden sm:inline">
              {isDeactivating ? 'Desactivando...' : 'Desactivar cliente'}
            </span>
          </Button>

          <div className="my-2 w-px bg-[var(--color-gray-200)]" />

          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              className="h-10 rounded-none border-none px-2 text-[var(--color-gray-500)] shadow-none hover:bg-[var(--color-gray-50)] hover:text-[var(--color-gray-700)] sm:px-3"
              disabled={isActionDisabled}
              aria-label="Abrir opciones de cliente"
            >
              <ChevronDown className="size-4" />
            </Button>
          </DropdownMenuTrigger>
        </div>
      </div>

      <DropdownMenuContent align="end">
        <DropdownMenuItem
          variant="destructive"
          disabled={isActionDisabled}
          onSelect={(event) => {
            event.preventDefault()
            onDeactivateRequest()
          }}
        >
          Desactivar cliente
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
