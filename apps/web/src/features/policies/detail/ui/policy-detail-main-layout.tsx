import type { ReactNode } from 'react'

export interface PolicyDetailMainLayoutProps {
  sections: ReactNode
  sidebar: ReactNode
}

export function PolicyDetailMainLayout({
  sections,
  sidebar,
}: PolicyDetailMainLayoutProps) {
  return (
    <div className="grid gap-6 xl:grid-cols-12">
      <div className="space-y-6 xl:col-span-8">{sections}</div>
      <aside className="space-y-6 xl:sticky xl:top-20 xl:col-span-4 xl:self-start">
        {sidebar}
      </aside>
    </div>
  )
}
