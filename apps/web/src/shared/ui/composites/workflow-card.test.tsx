// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { WorkflowCard } from '@/shared/ui/composites/workflow-card'

describe('WorkflowCard', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders title, steps and footer content', () => {
    render(
      <WorkflowCard
        title="Flujo"
        steps={[
          { id: 'draft', label: 'Borrador', state: 'completed' },
          {
            id: 'review',
            label: 'En revisión',
            state: 'current',
            metaText: 'Estado actual',
          },
          {
            id: 'settled',
            label: 'Liquidado',
            state: 'terminal',
            metaText: 'Estado terminal',
          },
        ]}
        footer={<div>Acciones del flujo</div>}
      />,
    )

    expect(screen.queryByText('Flujo')).not.toBeNull()
    expect(screen.queryByText('Borrador')).not.toBeNull()
    expect(screen.queryByText('En revisión')).not.toBeNull()
    expect(screen.queryByText('Liquidado')).not.toBeNull()
    expect(screen.queryByText('Estado actual')).not.toBeNull()
    expect(screen.queryByText('Estado terminal')).not.toBeNull()
    expect(screen.queryByText('Acciones del flujo')).not.toBeNull()
  })
})
