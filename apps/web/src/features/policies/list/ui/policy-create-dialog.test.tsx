// @vitest-environment jsdom
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { PolicyCreateDialog } from '@/features/policies/list/ui/policy-create-dialog'

vi.mock('@/shared/ui/composites/async-combobox', () => ({
  AsyncCombobox: ({
    value,
    onValueChange,
    placeholder,
  }: {
    value: string
    onValueChange: (value: string) => void
    placeholder?: string
  }) => (
    <button type="button" onClick={() => onValueChange('selected-id')}>
      {placeholder}:{value}
    </button>
  ),
}))

vi.mock('@/shared/ui/primitives/dialog', () => ({
  Dialog: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogContent: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  DialogHeader: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  DialogTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
  DialogDescription: ({ children }: { children: ReactNode }) => (
    <p>{children}</p>
  ),
  DialogFooter: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
}))

describe('PolicyCreateDialog', () => {
  afterEach(() => {
    cleanup()
  })

  it('forwards create dialog interactions', () => {
    const onOpenChange = vi.fn()
    const onPolicyNumberChange = vi.fn()
    const onClientChange = vi.fn()
    const onInsurerChange = vi.fn()
    const onPlanNameChange = vi.fn()
    const onEmployeeClassChange = vi.fn()
    const onMaxCoverageChange = vi.fn()
    const onDeductibleChange = vi.fn()
    const onStartDateChange = vi.fn()
    const onEndDateChange = vi.fn()
    const onSubmit = vi.fn()

    render(
      <PolicyCreateDialog
        open
        policyNumber=""
        clientId=""
        insurerId=""
        planName=""
        employeeClass=""
        maxCoverage=""
        deductible=""
        startDate=""
        endDate=""
        clientSearch=""
        insurerSearch=""
        clients={[]}
        insurers={[]}
        clientsLoading={false}
        insurersLoading={false}
        isSubmitting={false}
        onOpenChange={onOpenChange}
        onPolicyNumberChange={onPolicyNumberChange}
        onClientChange={onClientChange}
        onInsurerChange={onInsurerChange}
        onTypeChange={vi.fn()}
        onPlanNameChange={onPlanNameChange}
        onEmployeeClassChange={onEmployeeClassChange}
        onMaxCoverageChange={onMaxCoverageChange}
        onDeductibleChange={onDeductibleChange}
        onStartDateChange={onStartDateChange}
        onEndDateChange={onEndDateChange}
        onClientSearchChange={vi.fn()}
        onInsurerSearchChange={vi.fn()}
        onSubmit={onSubmit}
      />,
    )

    expect(screen.queryByText('Nueva póliza')).not.toBeNull()

    fireEvent.change(screen.getByLabelText('Número de póliza'), {
      target: { value: 'POL-2026-001' },
    })
    expect(onPolicyNumberChange).toHaveBeenCalledWith('POL-2026-001')

    fireEvent.click(screen.getByRole('button', { name: /Seleccionar cliente/ }))
    expect(onClientChange).toHaveBeenCalledWith('selected-id')

    fireEvent.click(
      screen.getByRole('button', { name: /Seleccionar aseguradora/ }),
    )
    expect(onInsurerChange).toHaveBeenCalledWith('selected-id')

    fireEvent.change(screen.getByLabelText('Nombre del plan'), {
      target: { value: 'Plan Corporativo' },
    })
    expect(onPlanNameChange).toHaveBeenCalledWith('Plan Corporativo')

    fireEvent.change(screen.getByLabelText('Clase de empleado'), {
      target: { value: 'Administrativo' },
    })
    expect(onEmployeeClassChange).toHaveBeenCalledWith('Administrativo')

    fireEvent.change(screen.getByLabelText('Cobertura máxima'), {
      target: { value: '500000.00' },
    })
    expect(onMaxCoverageChange).toHaveBeenCalledWith('500000.00')

    fireEvent.change(screen.getByLabelText('Deducible'), {
      target: { value: '1200.00' },
    })
    expect(onDeductibleChange).toHaveBeenCalledWith('1200.00')

    fireEvent.change(screen.getByLabelText('Inicio'), {
      target: { value: '2026-01-01' },
    })
    expect(onStartDateChange).toHaveBeenCalledWith('2026-01-01')

    fireEvent.change(screen.getByLabelText('Fin'), {
      target: { value: '2026-12-31' },
    })
    expect(onEndDateChange).toHaveBeenCalledWith('2026-12-31')

    fireEvent.click(screen.getByRole('button', { name: 'Crear póliza' }))
    expect(onSubmit).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('shows submitting state', () => {
    render(
      <PolicyCreateDialog
        open
        policyNumber="POL-001"
        clientId="client-id"
        insurerId="insurer-id"
        planName="Plan Corporativo"
        employeeClass="Administrativo"
        maxCoverage="500000.00"
        deductible="1200.00"
        startDate="2026-01-01"
        endDate="2026-12-31"
        clientSearch=""
        insurerSearch=""
        clients={[]}
        insurers={[]}
        clientsLoading={false}
        insurersLoading={false}
        isSubmitting
        onOpenChange={vi.fn()}
        onPolicyNumberChange={vi.fn()}
        onClientChange={vi.fn()}
        onInsurerChange={vi.fn()}
        onTypeChange={vi.fn()}
        onPlanNameChange={vi.fn()}
        onEmployeeClassChange={vi.fn()}
        onMaxCoverageChange={vi.fn()}
        onDeductibleChange={vi.fn()}
        onStartDateChange={vi.fn()}
        onEndDateChange={vi.fn()}
        onClientSearchChange={vi.fn()}
        onInsurerSearchChange={vi.fn()}
        onSubmit={vi.fn()}
      />,
    )

    expect(screen.queryByRole('button', { name: 'Creando...' })).not.toBeNull()
  })
})
