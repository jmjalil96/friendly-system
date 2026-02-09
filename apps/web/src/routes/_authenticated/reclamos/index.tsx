import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/reclamos/')({
  component: ReclamosPage,
})

function ReclamosPage() {
  return (
    <div className="p-[var(--space-xl)] px-[var(--space-2xl)]">
      <h1 className="text-[1.75rem] font-bold tracking-tight text-[var(--color-gray-900)]">
        Todos los reclamos
      </h1>
      <p className="mt-1 text-[0.85rem] text-[var(--color-gray-500)]">
        Lista de todos los reclamos
      </p>
    </div>
  )
}
