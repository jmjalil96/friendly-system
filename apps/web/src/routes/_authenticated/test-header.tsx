import { createFileRoute, useRouter } from '@tanstack/react-router'
import { type ColumnDef } from '@tanstack/react-table'
import {
  ChevronDown,
  Download,
  Filter,
  Plus,
  RefreshCw,
  Search,
  Settings,
  SlidersHorizontal,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/ui/data-table'
import { FilterBar } from '@/components/ui/filter-bar'
import { Input } from '@/components/ui/input'
import {
  PageHeader,
  PageHeaderActionGroup,
} from '@/components/ui/page-header'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/_authenticated/test-header')({
  component: TestHeaderPage,
})

/* ————————————————————————————————————————————
 * Placeholder content block for scrolling demos
 * ———————————————————————————————————————————— */

function ContentBlock({ label, rows = 8 }: { label: string; rows?: number }) {
  return (
    <div className="px-4 py-6 sm:px-6">
      <p className="mb-3 text-xs font-medium tracking-wide text-[var(--color-gray-400)] uppercase">
        {label}
      </p>
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="h-10 rounded-[var(--radius-sm)] bg-[var(--color-gray-100)]"
            style={{ width: `${70 + Math.sin(i * 1.3) * 25}%` }}
          />
        ))}
      </div>
    </div>
  )
}

/* ————————————————————————————————————————————
 * Section wrapper for each example
 * ———————————————————————————————————————————— */

function Section({
  heading,
  children,
}: {
  heading: string
  children: React.ReactNode
}) {
  return (
    <section className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-gray-200)] bg-white">
      <p className="border-b border-[var(--color-gray-100)] bg-[var(--color-gray-50)] px-4 py-2 text-[0.75rem] font-semibold tracking-wide text-[var(--color-gray-500)] uppercase sm:px-6">
        {heading}
      </p>
      <div className="max-h-[340px] overflow-y-auto">{children}</div>
    </section>
  )
}

/* ————————————————————————————————————————————
 * Mock claims data for DataTable demo
 * ———————————————————————————————————————————— */

type MockClaim = {
  id: string
  claimNumber: number
  status: 'DRAFT' | 'SUBMITTED' | 'IN_REVIEW' | 'PENDING_INFO' | 'RETURNED' | 'CANCELLED' | 'SETTLED'
  clientName: string
  affiliateName: string
  patientName: string
  description: string
  createdAt: string
}

const STATUS_CONFIG: Record<MockClaim['status'], { label: string; className: string }> = {
  DRAFT: { label: 'Borrador', className: 'bg-[var(--color-gray-100)] text-[var(--color-gray-600)]' },
  SUBMITTED: { label: 'Enviado', className: 'bg-[var(--color-blue-50)] text-[var(--color-blue-700)]' },
  IN_REVIEW: { label: 'En revisión', className: 'bg-[var(--color-amber-50)] text-[var(--color-amber-600)]' },
  PENDING_INFO: { label: 'Info pendiente', className: 'bg-[var(--color-amber-50)] text-[var(--color-amber-600)]' },
  RETURNED: { label: 'Devuelto', className: 'bg-[var(--color-red-50)] text-[var(--color-red-700)]' },
  CANCELLED: { label: 'Cancelado', className: 'bg-[var(--color-red-50)] text-[var(--color-red-700)]' },
  SETTLED: { label: 'Liquidado', className: 'bg-[var(--color-green-50)] text-[var(--color-green-600)]' },
}

const mockClaims: MockClaim[] = [
  { id: '1', claimNumber: 1001, status: 'SUBMITTED', clientName: 'Seguros del Sur', affiliateName: 'María González', patientName: 'María González', description: 'Consulta odontológica general', createdAt: '2026-01-15T10:30:00Z' },
  { id: '2', claimNumber: 1002, status: 'DRAFT', clientName: 'APS Global', affiliateName: 'Carlos Ramírez', patientName: 'Ana Ramírez', description: 'Emergencia hospitalaria', createdAt: '2026-01-14T14:00:00Z' },
  { id: '3', claimNumber: 1003, status: 'IN_REVIEW', clientName: 'Protección Total', affiliateName: 'José Martínez', patientName: 'José Martínez', description: 'Cirugía ambulatoria rodilla izquierda', createdAt: '2026-01-12T09:15:00Z' },
  { id: '4', claimNumber: 1004, status: 'SETTLED', clientName: 'Seguros del Sur', affiliateName: 'Laura Pérez', patientName: 'Laura Pérez', description: 'Exámenes de laboratorio', createdAt: '2026-01-10T11:00:00Z' },
  { id: '5', claimNumber: 1005, status: 'PENDING_INFO', clientName: 'Vida Segura', affiliateName: 'Ricardo López', patientName: 'Sofía López', description: 'Terapia física rehabilitación', createdAt: '2026-01-08T16:45:00Z' },
  { id: '6', claimNumber: 1006, status: 'CANCELLED', clientName: 'APS Global', affiliateName: 'Patricia Vargas', patientName: 'Patricia Vargas', description: 'Consulta dermatológica', createdAt: '2026-01-06T08:30:00Z' },
  { id: '7', claimNumber: 1007, status: 'RETURNED', clientName: 'Protección Total', affiliateName: 'Diego Herrera', patientName: 'Diego Herrera', description: 'Hospitalización 3 días', createdAt: '2026-01-05T13:00:00Z' },
  { id: '8', claimNumber: 1008, status: 'SUBMITTED', clientName: 'Vida Segura', affiliateName: 'Gabriela Castro', patientName: 'Miguel Castro', description: 'Control pediátrico', createdAt: '2026-01-03T10:00:00Z' },
  { id: '9', claimNumber: 1009, status: 'IN_REVIEW', clientName: 'Seguros del Sur', affiliateName: 'Fernando Díaz', patientName: 'Fernando Díaz', description: 'Resonancia magnética lumbar', createdAt: '2026-01-02T15:30:00Z' },
  { id: '10', claimNumber: 1010, status: 'DRAFT', clientName: 'APS Global', affiliateName: 'Valentina Rojas', patientName: 'Valentina Rojas', description: 'Consulta oftalmológica', createdAt: '2026-01-01T09:00:00Z' },
  { id: '11', claimNumber: 1011, status: 'SETTLED', clientName: 'Vida Segura', affiliateName: 'Andrés Moreno', patientName: 'Andrés Moreno', description: 'Extracción dental muela del juicio', createdAt: '2025-12-28T11:00:00Z' },
  { id: '12', claimNumber: 1012, status: 'SUBMITTED', clientName: 'Protección Total', affiliateName: 'Camila Torres', patientName: 'Camila Torres', description: 'Ecografía abdominal', createdAt: '2025-12-26T14:30:00Z' },
]

const claimColumns: ColumnDef<MockClaim>[] = [
  {
    accessorKey: 'claimNumber',
    header: 'Nro',
    cell: ({ row }) => (
      <span className="font-medium text-[var(--color-gray-900)]">
        #{row.getValue<number>('claimNumber')}
      </span>
    ),
  },
  {
    accessorKey: 'status',
    header: 'Estado',
    cell: ({ row }) => {
      const status = row.getValue<MockClaim['status']>('status')
      const config = STATUS_CONFIG[status]
      return (
        <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', config.className)}>
          {config.label}
        </span>
      )
    },
  },
  { accessorKey: 'clientName', header: 'Cliente' },
  { accessorKey: 'affiliateName', header: 'Afiliado' },
  { accessorKey: 'patientName', header: 'Paciente' },
  {
    accessorKey: 'description',
    header: 'Descripción',
    cell: ({ row }) => (
      <span className="block max-w-[200px] truncate text-[var(--color-gray-600)]">
        {row.getValue<string>('description')}
      </span>
    ),
  },
  {
    accessorKey: 'createdAt',
    header: 'Fecha',
    cell: ({ row }) => (
      <span className="text-xs text-[var(--color-gray-500)]">
        {new Date(row.getValue<string>('createdAt')).toLocaleDateString('es', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })}
      </span>
    ),
  },
]

/* ————————————————————————————————————————————
 * Test page
 * ———————————————————————————————————————————— */

function TestHeaderPage() {
  const router = useRouter()
  const [active, setActive] = useState(false)

  // ── FilterBar demo state ──
  const [search, setSearch] = useState('')
  const [estado, setEstado] = useState('')
  const [prioridad, setPrioridad] = useState('')

  const estadoOptions = ['Abierto', 'En revisión', 'Aprobado', 'Rechazado', 'Cerrado'] as const
  const prioridadOptions = ['Alta', 'Media', 'Baja'] as const

  const activeChips: { key: string; label: string; clear: () => void }[] = []
  if (search) activeChips.push({ key: 'search', label: `"${search}"`, clear: () => setSearch('') })
  if (estado) activeChips.push({ key: 'estado', label: `Estado: ${estado}`, clear: () => setEstado('') })
  if (prioridad) activeChips.push({ key: 'prioridad', label: `Prioridad: ${prioridad}`, clear: () => setPrioridad('') })

  const clearAllFilters = () => { setSearch(''); setEstado(''); setPrioridad('') }

  return (
    <div className="space-y-8 p-4 sm:p-6 md:p-8">
      <div>
        <h1 className="text-[1.75rem] font-bold tracking-tight text-[var(--color-gray-900)]">
          Component demos
        </h1>
        <p className="mt-1 text-[0.85rem] text-[var(--color-gray-500)]">
          Scroll inside each card to test sticky behavior
        </p>
      </div>

      {/* 1 — Title only */}
      <Section heading="1. Title only">
        <PageHeader title="Dashboard" />
        <ContentBlock label="Page content" />
      </Section>

      {/* 2 — Title + subtitle */}
      <Section heading="2. Title + subtitle">
        <PageHeader
          title="Todos los reclamos"
          subtitle="Lista completa de reclamos ingresados en el sistema"
        />
        <ContentBlock label="Table rows" />
      </Section>

      {/* 3 — Title + subtitle + single action */}
      <Section heading="3. Single action">
        <PageHeader
          title="Pólizas vigentes"
          subtitle="Administración de pólizas activas"
          actions={
            <PageHeaderActionGroup>
              <Button
                size="sm"
                className="bg-[var(--color-red-500)] text-white shadow-sm hover:bg-[var(--color-red-700)]"
              >
                <Plus />
                Nueva póliza
              </Button>
            </PageHeaderActionGroup>
          }
        />
        <ContentBlock label="Policy cards" />
      </Section>

      {/* 4 — Multiple action groups with separators */}
      <Section heading="4. Multiple action groups (auto-separators)">
        <PageHeader
          title="Reportes"
          subtitle="Generación y exportación de reportes"
          actions={
            <>
              <PageHeaderActionGroup>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setActive(!active)}
                  className="gap-1.5 text-[var(--color-gray-600)]"
                >
                  {active ? (
                    <ToggleRight className="text-[var(--color-blue-500)]" />
                  ) : (
                    <ToggleLeft />
                  )}
                  <span className="hidden sm:inline">
                    {active ? 'Activo' : 'Inactivo'}
                  </span>
                </Button>
              </PageHeaderActionGroup>

              <PageHeaderActionGroup>
                <Button variant="outline" size="sm">
                  <Filter />
                  <span className="hidden sm:inline">Filtros</span>
                </Button>
                <Button variant="outline" size="sm">
                  <RefreshCw />
                </Button>
              </PageHeaderActionGroup>

              <PageHeaderActionGroup>
                <Button
                  size="sm"
                  className="bg-[var(--color-blue-500)] text-white shadow-sm hover:bg-[var(--color-blue-700)]"
                >
                  <Download />
                  <span className="hidden sm:inline">Exportar</span>
                </Button>
              </PageHeaderActionGroup>
            </>
          }
        />
        <ContentBlock label="Charts and data" rows={12} />
      </Section>

      {/* 5 — With back button */}
      <Section heading="5. Back button">
        <PageHeader
          title="Detalle del reclamo #1042"
          subtitle="Creado el 15 de enero de 2026"
          onBack={() => router.history.back()}
          actions={
            <PageHeaderActionGroup>
              <Button variant="outline" size="sm">
                <Settings />
                <span className="hidden sm:inline">Opciones</span>
              </Button>
            </PageHeaderActionGroup>
          }
        />
        <ContentBlock label="Claim details" rows={10} />
      </Section>

      {/* 6 — FilterBar */}
      <Section heading="6. FilterBar">
        <PageHeader
          title="Todos los reclamos"
          subtitle="Lista completa de reclamos ingresados"
        />
        <FilterBar>
          <FilterBar.Row>
            <FilterBar.Controls>
              {/* Search with icon */}
              <div className="relative w-full sm:w-auto sm:min-w-[240px]">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[var(--color-gray-400)]" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar reclamo..."
                  className="h-8 pl-8 text-sm"
                />
              </div>

              {/* Estado pill toggle */}
              <button
                type="button"
                onClick={() => setEstado(estado ? '' : estadoOptions[0])}
                className={`inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors ${
                  estado
                    ? 'border-[var(--color-blue-500)]/30 bg-[var(--color-blue-50)] text-[var(--color-blue-700)]'
                    : 'border-[var(--color-gray-200)] bg-[var(--color-gray-50)] text-[var(--color-gray-600)] hover:border-[var(--color-gray-300)] hover:bg-[var(--color-gray-100)]'
                }`}
              >
                Estado{estado ? `: ${estado}` : ''}
                <ChevronDown className="size-3 opacity-50" />
              </button>

              {/* Prioridad pill toggle */}
              <button
                type="button"
                onClick={() => setPrioridad(prioridad ? '' : prioridadOptions[0])}
                className={`inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors ${
                  prioridad
                    ? 'border-[var(--color-blue-500)]/30 bg-[var(--color-blue-50)] text-[var(--color-blue-700)]'
                    : 'border-[var(--color-gray-200)] bg-[var(--color-gray-50)] text-[var(--color-gray-600)] hover:border-[var(--color-gray-300)] hover:bg-[var(--color-gray-100)]'
                }`}
              >
                Prioridad{prioridad ? `: ${prioridad}` : ''}
                <ChevronDown className="size-3 opacity-50" />
              </button>
            </FilterBar.Controls>

            <FilterBar.Actions>
              {activeChips.length > 0 && (
                <FilterBar.ClearAll onClear={clearAllFilters} />
              )}
              <Button variant="outline" size="sm" className="h-8 gap-1.5 rounded-full text-xs">
                <SlidersHorizontal className="size-3.5 opacity-60" />
                Mas filtros
              </Button>
            </FilterBar.Actions>
          </FilterBar.Row>

          <FilterBar.Chips>
            {activeChips.map((chip) => (
              <FilterBar.Chip key={chip.key} label={chip.label} onRemove={chip.clear} />
            ))}
          </FilterBar.Chips>
        </FilterBar>
        <ContentBlock label="Filtered results" rows={10} />
      </Section>

      {/* 7 — DataTable */}
      <section className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-gray-200)] bg-white">
        <p className="border-b border-[var(--color-gray-100)] bg-[var(--color-gray-50)] px-4 py-2 text-[0.75rem] font-semibold tracking-wide text-[var(--color-gray-500)] uppercase sm:px-6">
          7. DataTable
        </p>
        <div className="p-4 sm:p-6">
          <DataTable columns={claimColumns} data={mockClaims} pageSize={5} />
        </div>
      </section>
    </div>
  )
}
