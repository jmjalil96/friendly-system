import { Loader2 } from 'lucide-react'
import type {
  LookupPolicyClientsResponse,
  LookupPolicyInsurersResponse,
  PolicyType,
} from '@friendly-system/shared'
import { AsyncCombobox } from '@/shared/ui/composites/async-combobox'
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

type LookupClientItem = LookupPolicyClientsResponse['data'][number]
type LookupInsurerItem = LookupPolicyInsurersResponse['data'][number]

export interface PolicyCreateDialogProps {
  open: boolean
  policyNumber: string
  clientId: string
  insurerId: string
  type?: PolicyType
  planName: string
  employeeClass: string
  maxCoverage: string
  deductible: string
  startDate: string
  endDate: string
  clientSearch: string
  insurerSearch: string
  clients: LookupClientItem[]
  insurers: LookupInsurerItem[]
  clientsLoading: boolean
  insurersLoading: boolean
  isSubmitting: boolean
  error?: string
  onOpenChange: (open: boolean) => void
  onPolicyNumberChange: (value: string) => void
  onClientChange: (value: string) => void
  onInsurerChange: (value: string) => void
  onTypeChange: (value?: PolicyType) => void
  onPlanNameChange: (value: string) => void
  onEmployeeClassChange: (value: string) => void
  onMaxCoverageChange: (value: string) => void
  onDeductibleChange: (value: string) => void
  onStartDateChange: (value: string) => void
  onEndDateChange: (value: string) => void
  onClientSearchChange: (value: string) => void
  onInsurerSearchChange: (value: string) => void
  onSubmit: () => void | Promise<void>
}

export function PolicyCreateDialog({
  open,
  policyNumber,
  clientId,
  insurerId,
  type,
  planName,
  employeeClass,
  maxCoverage,
  deductible,
  startDate,
  endDate,
  clientSearch,
  insurerSearch,
  clients,
  insurers,
  clientsLoading,
  insurersLoading,
  isSubmitting,
  error,
  onOpenChange,
  onPolicyNumberChange,
  onClientChange,
  onInsurerChange,
  onTypeChange,
  onPlanNameChange,
  onEmployeeClassChange,
  onMaxCoverageChange,
  onDeductibleChange,
  onStartDateChange,
  onEndDateChange,
  onClientSearchChange,
  onInsurerSearchChange,
  onSubmit,
}: PolicyCreateDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={!isSubmitting}>
        <DialogHeader>
          <DialogTitle>Nueva póliza</DialogTitle>
          <DialogDescription>
            Crea una póliza desde el listado y continúa en su detalle.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="policy-create-number">Número de póliza</Label>
            <Input
              id="policy-create-number"
              value={policyNumber}
              onChange={(event) => onPolicyNumberChange(event.target.value)}
              placeholder="Ej. POL-2026-001"
              disabled={isSubmitting}
              maxLength={100}
            />
          </div>

          <div className="space-y-2">
            <Label>Cliente</Label>
            <AsyncCombobox
              value={clientId}
              onValueChange={onClientChange}
              options={clients}
              getOptionValue={(client) => client.id}
              getOptionLabel={(client) => client.name}
              searchQuery={clientSearch}
              onSearchChange={onClientSearchChange}
              isLoading={clientsLoading}
              placeholder="Seleccionar cliente..."
              searchPlaceholder="Buscar cliente..."
              emptyMessage="No se encontraron clientes."
            />
          </div>

          <div className="space-y-2">
            <Label>Aseguradora</Label>
            <AsyncCombobox
              value={insurerId}
              onValueChange={onInsurerChange}
              options={insurers}
              getOptionValue={(insurer) => insurer.id}
              getOptionLabel={(insurer) => insurer.name}
              searchQuery={insurerSearch}
              onSearchChange={onInsurerSearchChange}
              isLoading={insurersLoading}
              placeholder="Seleccionar aseguradora..."
              searchPlaceholder="Buscar aseguradora..."
              emptyMessage="No se encontraron aseguradoras."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="policy-create-type">Tipo</Label>
            <Select
              value={type ?? 'none'}
              onValueChange={(value) =>
                onTypeChange(
                  value === 'none' ? undefined : (value as PolicyType),
                )
              }
              disabled={isSubmitting}
            >
              <SelectTrigger id="policy-create-type">
                <SelectValue placeholder="Seleccionar tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin tipo</SelectItem>
                <SelectItem value="HEALTH">Salud</SelectItem>
                <SelectItem value="LIFE">Vida</SelectItem>
                <SelectItem value="ACCIDENTS">Accidentes</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="policy-create-plan-name">Nombre del plan</Label>
            <Input
              id="policy-create-plan-name"
              value={planName}
              onChange={(event) => onPlanNameChange(event.target.value)}
              placeholder="Ej. Plan Corporativo"
              disabled={isSubmitting}
              maxLength={255}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="policy-create-employee-class">
              Clase de empleado
            </Label>
            <Input
              id="policy-create-employee-class"
              value={employeeClass}
              onChange={(event) => onEmployeeClassChange(event.target.value)}
              placeholder="Ej. Administrativo"
              disabled={isSubmitting}
              maxLength={100}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="policy-create-max-coverage">
                Cobertura máxima
              </Label>
              <Input
                id="policy-create-max-coverage"
                inputMode="decimal"
                value={maxCoverage}
                onChange={(event) => onMaxCoverageChange(event.target.value)}
                placeholder="0.00"
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="policy-create-deductible">Deducible</Label>
              <Input
                id="policy-create-deductible"
                inputMode="decimal"
                value={deductible}
                onChange={(event) => onDeductibleChange(event.target.value)}
                placeholder="0.00"
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="policy-create-start-date">Inicio</Label>
              <Input
                id="policy-create-start-date"
                type="date"
                value={startDate}
                onChange={(event) => onStartDateChange(event.target.value)}
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="policy-create-end-date">Fin</Label>
              <Input
                id="policy-create-end-date"
                type="date"
                value={endDate}
                onChange={(event) => onEndDateChange(event.target.value)}
                disabled={isSubmitting}
              />
            </div>
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
            {isSubmitting ? 'Creando...' : 'Crear póliza'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
