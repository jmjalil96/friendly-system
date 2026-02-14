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

export interface InsurerCreateDialogProps {
  open: boolean
  name: string
  type: 'MEDICINA_PREPAGADA' | 'COMPANIA_DE_SEGUROS'
  isActive: boolean
  isSubmitting: boolean
  error?: string
  onOpenChange: (open: boolean) => void
  onNameChange: (value: string) => void
  onTypeChange: (value: 'MEDICINA_PREPAGADA' | 'COMPANIA_DE_SEGUROS') => void
  onIsActiveChange: (value: boolean) => void
  onSubmit: () => void | Promise<void>
}

export function InsurerCreateDialog({
  open,
  name,
  type,
  isActive,
  isSubmitting,
  error,
  onOpenChange,
  onNameChange,
  onTypeChange,
  onIsActiveChange,
  onSubmit,
}: InsurerCreateDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={!isSubmitting}>
        <DialogHeader>
          <DialogTitle>Nueva aseguradora</DialogTitle>
          <DialogDescription>
            Crea una aseguradora y luego completa su información desde el
            detalle.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="insurer-create-name">Nombre</Label>
            <Input
              id="insurer-create-name"
              value={name}
              onChange={(event) => onNameChange(event.target.value)}
              placeholder="Ej. Sura Medicina Prepagada"
              disabled={isSubmitting}
              maxLength={255}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="insurer-create-type">Tipo</Label>
            <Select
              value={type}
              onValueChange={(value) =>
                onTypeChange(
                  value as 'MEDICINA_PREPAGADA' | 'COMPANIA_DE_SEGUROS',
                )
              }
              disabled={isSubmitting}
            >
              <SelectTrigger id="insurer-create-type">
                <SelectValue placeholder="Seleccionar tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MEDICINA_PREPAGADA">
                  Medicina prepagada
                </SelectItem>
                <SelectItem value="COMPANIA_DE_SEGUROS">
                  Compañía de seguros
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="insurer-create-status">Estado inicial</Label>
            <Select
              value={isActive ? 'active' : 'inactive'}
              onValueChange={(value) => onIsActiveChange(value === 'active')}
              disabled={isSubmitting}
            >
              <SelectTrigger id="insurer-create-status">
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
            {isSubmitting ? 'Creando...' : 'Crear aseguradora'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
