import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/reclamos/nuevo')({
  component: NuevoReclamoPage,
})

function NuevoReclamoPage() {
  return (
    <div className="p-[var(--space-xl)] px-[var(--space-2xl)]">
      <h1 className="text-[1.75rem] font-bold tracking-tight text-[var(--color-gray-900)]">
        Nuevo reclamo
      </h1>
      <p className="mt-1 text-[0.85rem] text-[var(--color-gray-500)]">
        Crear un nuevo reclamo
      </p>
    </div>
  )
}
