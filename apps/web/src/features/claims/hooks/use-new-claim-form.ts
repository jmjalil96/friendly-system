import { useState, useMemo, useCallback } from 'react'
import {
  useCreateClaim,
  useLookupClients,
  useLookupClientAffiliates,
  useLookupAffiliatePatients,
} from './use-claims'
import { useDebouncedValue } from '@/hooks/use-debounced-value'

export function useNewClaimForm() {
  // ── Form state ──────────────────────────────────────────────────
  const [clientId, setClientId] = useState('')
  const [affiliateId, setAffiliateId] = useState('')
  const [patientId, setPatientId] = useState('')
  const [description, setDescription] = useState('')

  // ── Search state ────────────────────────────────────────────────
  const [clientSearch, setClientSearch] = useState('')
  const [affiliateSearch, setAffiliateSearch] = useState('')
  const [patientSearch, setPatientSearch] = useState('')

  const debouncedClientSearch = useDebouncedValue(clientSearch)
  const debouncedAffiliateSearch = useDebouncedValue(affiliateSearch)

  // ── Queries ─────────────────────────────────────────────────────
  const clientsQuery = useLookupClients(
    debouncedClientSearch ? { search: debouncedClientSearch } : {},
  )
  const affiliatesQuery = useLookupClientAffiliates(
    clientId,
    debouncedAffiliateSearch ? { search: debouncedAffiliateSearch } : {},
  )
  const patientsQuery = useLookupAffiliatePatients(affiliateId)

  // ── Mutation ────────────────────────────────────────────────────
  const { createClaim, createClaimStatus } = useCreateClaim()

  // ── Cascade handlers ────────────────────────────────────────────
  const handleClientChange = useCallback((value: string) => {
    setClientId(value)
    setAffiliateId('')
    setPatientId('')
    setAffiliateSearch('')
    setPatientSearch('')
  }, [])

  const handleAffiliateChange = useCallback((value: string) => {
    setAffiliateId(value)
    setPatientId('')
    setPatientSearch('')
  }, [])

  // ── Derived ─────────────────────────────────────────────────────
  const isSubmitting = createClaimStatus === 'pending'

  const canSubmit =
    Boolean(clientId) &&
    Boolean(affiliateId) &&
    Boolean(patientId) &&
    description.trim().length > 0 &&
    !isSubmitting

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return
    try {
      await createClaim({ clientId, affiliateId, patientId, description })
    } catch {
      // Error already toasted by api.ts
    }
  }, [canSubmit, createClaim, clientId, affiliateId, patientId, description])

  const filteredPatients = useMemo(() => {
    const patients = patientsQuery.data?.data ?? []
    const query = patientSearch.trim().toLowerCase()
    if (!query) return patients

    return patients.filter((patient) => {
      const fullName = `${patient.firstName} ${patient.lastName}`.toLowerCase()
      const relationship = (patient.relationship ?? 'TITULAR').toLowerCase()
      const document = `${patient.documentType ?? ''} ${patient.documentNumber ?? ''}`.toLowerCase()
      return (
        fullName.includes(query) ||
        relationship.includes(query) ||
        document.includes(query)
      )
    })
  }, [patientsQuery.data?.data, patientSearch])

  // ── Props getters ───────────────────────────────────────────────
  const dataCardProps = useMemo(
    () => ({
      clientId,
      onClientChange: handleClientChange,
      clientSearch,
      onClientSearchChange: setClientSearch,
      clients: clientsQuery.data?.data ?? [],
      clientsLoading: clientsQuery.isFetching,

      affiliateId,
      onAffiliateChange: handleAffiliateChange,
      affiliateSearch,
      onAffiliateSearchChange: setAffiliateSearch,
      affiliates: affiliatesQuery.data?.data ?? [],
      affiliatesLoading: affiliatesQuery.isFetching,

      patientId,
      onPatientChange: setPatientId,
      patientSearch,
      onPatientSearchChange: setPatientSearch,
      patients: filteredPatients,
      patientsLoading: patientsQuery.isFetching,
    }),
    [
      clientId,
      handleClientChange,
      clientSearch,
      clientsQuery.data?.data,
      clientsQuery.isFetching,
      affiliateId,
      handleAffiliateChange,
      affiliateSearch,
      affiliatesQuery.data?.data,
      affiliatesQuery.isFetching,
      patientId,
      patientSearch,
      filteredPatients,
      patientsQuery.isFetching,
    ],
  )

  const descriptionCardProps = useMemo(
    () => ({
      description,
      onDescriptionChange: setDescription,
    }),
    [description],
  )

  return {
    canSubmit,
    isSubmitting,
    handleSubmit,
    dataCardProps,
    descriptionCardProps,
  }
}
