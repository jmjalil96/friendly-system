import { Loader2 } from 'lucide-react'
import { Button } from '@/shared/ui/primitives/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/primitives/dialog'
import { Input } from '@/shared/ui/primitives/input'
import { Label } from '@/shared/ui/primitives/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/primitives/select'

export interface ClientCreateDialogProps {
  open: boolean
  name: string
  isActive: boolean
  isSubmitting: boolean
  error?: string
  onOpenChange: (open: boolean) => void
  onNameChange: (value: string) => void
  onIsActiveChange: (value: boolean) => void
  onSubmit: () => void | Promise<void>
}

export function ClientCreateDialog({
  open,
  name,
  isActive,
  isSubmitting,
  error,
  onOpenChange,
  onNameChange,
  onIsActiveChange,
  onSubmit,
}: ClientCreateDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={!isSubmitting}>
        <DialogHeader>
          <DialogTitle>Nuevo cliente</DialogTitle>
          <DialogDescription>
            Crea un cliente y luego completa su información desde el detalle.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="client-create-name">Nombre</Label>
            <Input
              id="client-create-name"
              value={name}
              onChange={(event) => onNameChange(event.target.value)}
              placeholder="Ej. Empresas Alpha S.A."
              disabled={isSubmitting}
              maxLength={255}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="client-create-status">Estado inicial</Label>
            <Select
              value={isActive ? 'active' : 'inactive'}
              onValueChange={(value) => onIsActiveChange(value === 'active')}
              disabled={isSubmitting}
            >
              <SelectTrigger id="client-create-status">
                <SelectValue placeholder="Seleccionar estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Activo</SelectItem>
                <SelectItem value="inactive">Inactivo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {error ? (
            <p className="text-sm text-[var(--color-red-600)]">{error}</p>
          ) : null}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isSubmitting}
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={isSubmitting}
            onClick={() => void onSubmit()}
          >
            {isSubmitting ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : null}
            {isSubmitting ? 'Creando...' : 'Crear cliente'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
