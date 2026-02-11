import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/reclamos/$id')({
  component: ReclamoDetailPage,
})

function ReclamoDetailPage() {
  const { id } = Route.useParams()

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 xl:px-8">
      <h1 className="text-xl font-bold tracking-tight text-[var(--color-gray-900)] sm:text-2xl">
        Detalle del reclamo
      </h1>
      <p className="mt-2 text-sm text-[var(--color-gray-500)]">
        Reclamo {id}
      </p>
    </div>
  )
}
