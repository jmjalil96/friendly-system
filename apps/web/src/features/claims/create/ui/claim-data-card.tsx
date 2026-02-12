import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/ui/primitives/card'
import { Label } from '@/shared/ui/primitives/label'
import { AsyncCombobox } from '@/shared/ui/composites/async-combobox'
import type {
  LookupClientsResponse,
  LookupClientAffiliatesResponse,
  LookupAffiliatePatientsResponse,
} from '@friendly-system/shared'

type LookupClientsItem = LookupClientsResponse['data'][number]
type LookupClientAffiliatesItem = LookupClientAffiliatesResponse['data'][number]
type LookupAffiliatePatientsItem = LookupAffiliatePatientsResponse['data'][number]

export interface ClaimDataCardProps {
  clientId: string
  onClientChange: (value: string) => void
  clientSearch: string
  onClientSearchChange: (query: string) => void
  clients: LookupClientsItem[]
  clientsLoading: boolean

  affiliateId: string
  onAffiliateChange: (value: string) => void
  affiliateSearch: string
  onAffiliateSearchChange: (query: string) => void
  affiliates: LookupClientAffiliatesItem[]
  affiliatesLoading: boolean

  patientId: string
  onPatientChange: (value: string) => void
  patientSearch: string
  onPatientSearchChange: (query: string) => void
  patients: LookupAffiliatePatientsItem[]
  patientsLoading: boolean
}

function formatAffiliate(a: LookupClientAffiliatesItem) {
  const doc = a.documentNumber ? ` — ${a.documentType}: ${a.documentNumber}` : ''
  return `${a.firstName} ${a.lastName}${doc}`
}

function formatPatient(p: LookupAffiliatePatientsItem) {
  const tag = p.relationship ? ` [${p.relationship}]` : ' [TITULAR]'
  return `${p.firstName} ${p.lastName}${tag}`
}

export function ClaimDataCard({
  clientId,
  onClientChange,
  clientSearch,
  onClientSearchChange,
  clients,
  clientsLoading,
  affiliateId,
  onAffiliateChange,
  affiliateSearch,
  onAffiliateSearchChange,
  affiliates,
  affiliatesLoading,
  patientId,
  onPatientChange,
  patientSearch,
  onPatientSearchChange,
  patients,
  patientsLoading,
}: ClaimDataCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2.5 sm:gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[var(--color-blue-500)] text-base font-bold text-white sm:size-11 sm:rounded-2xl sm:text-lg">
            01
          </span>
          <span className="text-[var(--color-gray-900)]">Datos del reclamo</span>
        </CardTitle>
        <CardDescription className="pl-12 sm:pl-14">
          Selecciona el cliente, afiliado y paciente
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 sm:space-y-6">
        {/* Client */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="flex size-5 items-center justify-center rounded-full bg-[var(--color-blue-500)] text-[0.65rem] font-bold text-white">1</span>
            <Label className="text-[0.8rem] font-semibold text-[var(--color-gray-600)]">Cliente</Label>
          </div>
          <AsyncCombobox
            value={clientId}
            onValueChange={onClientChange}
            options={clients}
            getOptionValue={(c) => c.id}
            getOptionLabel={(c) => c.name}
            searchQuery={clientSearch}
            onSearchChange={onClientSearchChange}
            isLoading={clientsLoading}
            placeholder="Seleccionar cliente..."
            searchPlaceholder="Buscar cliente..."
            emptyMessage="No se encontraron clientes."
          />
        </div>

        {/* Affiliate */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="flex size-5 items-center justify-center rounded-full bg-[var(--color-blue-500)] text-[0.65rem] font-bold text-white">2</span>
            <Label className="text-[0.8rem] font-semibold text-[var(--color-gray-600)]">Afiliado</Label>
          </div>
          <AsyncCombobox
            value={affiliateId}
            onValueChange={onAffiliateChange}
            options={affiliates}
            getOptionValue={(a) => a.id}
            getOptionLabel={formatAffiliate}
            searchQuery={affiliateSearch}
            onSearchChange={onAffiliateSearchChange}
            isLoading={affiliatesLoading}
            disabled={!clientId}
            placeholder={clientId ? 'Seleccionar afiliado...' : 'Selecciona un cliente primero'}
            searchPlaceholder="Buscar afiliado..."
            emptyMessage="No se encontraron afiliados."
          />
        </div>

        {/* Patient */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="flex size-5 items-center justify-center rounded-full bg-[var(--color-blue-500)] text-[0.65rem] font-bold text-white">3</span>
            <Label className="text-[0.8rem] font-semibold text-[var(--color-gray-600)]">Paciente</Label>
          </div>
          <AsyncCombobox
            value={patientId}
            onValueChange={onPatientChange}
            options={patients}
            getOptionValue={(p) => p.id}
            getOptionLabel={formatPatient}
            searchQuery={patientSearch}
            onSearchChange={onPatientSearchChange}
            isLoading={patientsLoading}
            disabled={!affiliateId}
            placeholder={affiliateId ? 'Seleccionar paciente...' : 'Selecciona un afiliado primero'}
            searchPlaceholder="Buscar paciente..."
            emptyMessage="No se encontraron pacientes."
          />
        </div>
      </CardContent>
    </Card>
  )
}
