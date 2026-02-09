import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/')({
  component: HomePage,
})

function HomePage() {
  return (
    <div className="p-[var(--space-md)] md:p-[var(--space-xl)] md:px-[var(--space-2xl)]">
      <h1 className="text-[1.75rem] font-bold tracking-tight text-[var(--color-gray-900)]">
        Dashboard
      </h1>
    </div>
  )
}
