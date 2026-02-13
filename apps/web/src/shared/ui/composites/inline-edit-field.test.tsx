// @vitest-environment jsdom
import { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { InlineEditField } from '@/shared/ui/composites/inline-edit-field'

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

function InlineFieldHarness({
  nullable = false,
  isSaving = false,
}: {
  nullable?: boolean
  isSaving?: boolean
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState('Valor inicial')
  const onSave = vi.fn()

  return (
    <InlineEditField
      label="Descripcion"
      displayValue={draft || 'Sin dato'}
      variant="text"
      editable
      isEditing={isEditing}
      isSaving={isSaving}
      draftValue={draft}
      nullable={nullable}
      onDraftChange={setDraft}
      onStartEdit={() => setIsEditing(true)}
      onCancel={() => setIsEditing(false)}
      onSave={onSave}
    />
  )
}

describe('InlineEditField', () => {
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('toggles display and edit mode and triggers save action', () => {
    const onSave = vi.fn()
    const Harness = () => {
      const [isEditing, setIsEditing] = useState(false)
      const [draft, setDraft] = useState('Descripcion inicial')

      return (
        <InlineEditField
          label="Descripcion"
          displayValue={draft}
          variant="text"
          editable
          isEditing={isEditing}
          isSaving={false}
          draftValue={draft}
          onDraftChange={setDraft}
          onStartEdit={() => setIsEditing(true)}
          onCancel={() => setIsEditing(false)}
          onSave={onSave}
        />
      )
    }

    render(<Harness />)

    expect(screen.queryByDisplayValue('Descripcion inicial')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /Editar/i }))

    const input = screen.getByDisplayValue('Descripcion inicial')
    fireEvent.change(input, { target: { value: 'Descripcion actualizada' } })
    fireEvent.click(screen.getByRole('button', { name: /Guardar/i }))

    expect(onSave).toHaveBeenCalledTimes(1)
  })

  it('supports nullable clear action while editing', () => {
    render(<InlineFieldHarness nullable />)

    fireEvent.click(screen.getByRole('button', { name: /Editar/i }))
    fireEvent.click(screen.getByRole('button', { name: /Limpiar/i }))

    const input = screen.getByRole('textbox')
    expect((input as HTMLInputElement).value).toBe('')
  })

  it('disables action buttons while saving', () => {
    render(<InlineFieldHarness isSaving />)

    fireEvent.click(screen.getByRole('button', { name: /Editar/i }))

    const cancelButton = screen.getByRole('button', { name: /Cancelar/i })
    const saveButton = screen.getByRole('button', { name: /Guardar/i })

    expect((cancelButton as HTMLButtonElement).disabled).toBe(true)
    expect((saveButton as HTMLButtonElement).disabled).toBe(true)
  })

  it('uses day-first text format for date editors', () => {
    render(
      <InlineEditField
        label="Fecha de incidente"
        displayValue="15/01/2026"
        variant="date"
        editable
        isEditing
        isSaving={false}
        draftValue="15/01/2026"
        onDraftChange={() => {}}
        onStartEdit={() => {}}
        onCancel={() => {}}
        onSave={() => {}}
      />,
    )

    const input = screen.getByDisplayValue('15/01/2026')
    expect((input as HTMLInputElement).type).toBe('text')
    expect((input as HTMLInputElement).placeholder).toBe('DD/MM/AAAA')
    expect((input as HTMLInputElement).pattern).toBe(
      '[0-9]{2}/[0-9]{2}/[0-9]{4}',
    )
    expect((input as HTMLInputElement).maxLength).toBe(10)
    expect(
      screen.getByRole('button', { name: 'Abrir calendario' }),
    ).toBeDefined()
  })

  it('updates date draft when selecting a day from calendar', () => {
    const Harness = () => {
      const [draft, setDraft] = useState('15/01/2026')
      return (
        <InlineEditField
          label="Fecha de incidente"
          displayValue={draft || 'Sin dato'}
          variant="date"
          editable
          isEditing
          isSaving={false}
          draftValue={draft}
          onDraftChange={setDraft}
          onStartEdit={() => {}}
          onCancel={() => {}}
          onSave={() => {}}
        />
      )
    }

    render(<Harness />)

    fireEvent.click(screen.getByRole('button', { name: 'Abrir calendario' }))
    fireEvent.click(screen.getByRole('button', { name: /16.*enero.*2026/i }))

    const input = screen.getByRole('textbox')
    expect((input as HTMLInputElement).value).toBe('16/01/2026')
  })

  it('masks date typing and triggers blur callback', () => {
    const onDraftBlur = vi.fn()

    const Harness = () => {
      const [draft, setDraft] = useState('')
      return (
        <InlineEditField
          label="Fecha de incidente"
          displayValue={draft || 'Sin dato'}
          variant="date"
          editable
          isEditing
          isSaving={false}
          draftValue={draft}
          onDraftChange={setDraft}
          onDraftBlur={onDraftBlur}
          onStartEdit={() => {}}
          onCancel={() => {}}
          onSave={() => {}}
        />
      )
    }

    render(<Harness />)

    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: '15012026' } })
    expect((input as HTMLInputElement).value).toBe('15/01/2026')

    fireEvent.blur(input)
    expect(onDraftBlur).toHaveBeenCalledTimes(1)
  })

  it('does not trigger date blur validation when moving focus into calendar popover', () => {
    const onDraftBlur = vi.fn()

    render(
      <InlineEditField
        label="Fecha de incidente"
        displayValue="15/01/2026"
        variant="date"
        editable
        isEditing
        isSaving={false}
        draftValue="15/01/2026"
        onDraftChange={() => {}}
        onDraftBlur={onDraftBlur}
        onStartEdit={() => {}}
        onCancel={() => {}}
        onSave={() => {}}
      />,
    )

    const input = screen.getByRole('textbox')
    fireEvent.click(screen.getByRole('button', { name: 'Abrir calendario' }))
    const dayButton = screen.getByRole('button', { name: /16.*enero.*2026/i })

    fireEvent.blur(input, { relatedTarget: dayButton })

    expect(onDraftBlur).toHaveBeenCalledTimes(0)
  })

  it('saves date field on Enter from trigger after choosing a calendar day', () => {
    const onSave = vi.fn()

    const Harness = () => {
      const [draft, setDraft] = useState('15/01/2026')
      return (
        <InlineEditField
          label="Fecha de incidente"
          displayValue={draft || 'Sin dato'}
          variant="date"
          editable
          isEditing
          isSaving={false}
          draftValue={draft}
          onDraftChange={setDraft}
          onStartEdit={() => {}}
          onCancel={() => {}}
          onSave={onSave}
        />
      )
    }

    render(<Harness />)

    const trigger = screen.getByRole('button', { name: 'Abrir calendario' })
    fireEvent.keyDown(trigger, { key: 'Enter' })
    expect(onSave).toHaveBeenCalledTimes(0)

    fireEvent.click(trigger)
    fireEvent.click(screen.getByRole('button', { name: /16.*enero.*2026/i }))

    fireEvent.keyDown(
      screen.getByRole('button', { name: 'Abrir calendario' }),
      {
        key: 'Enter',
      },
    )
    expect(onSave).toHaveBeenCalledTimes(1)
  })

  it('saves text fields on Enter', () => {
    const onSave = vi.fn()

    render(
      <InlineEditField
        label="Descripcion"
        displayValue="Descripcion"
        variant="text"
        editable
        isEditing
        isSaving={false}
        draftValue="Descripcion"
        onDraftChange={() => {}}
        onStartEdit={() => {}}
        onCancel={() => {}}
        onSave={onSave}
      />,
    )

    const input = screen.getByDisplayValue('Descripcion')
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(onSave).toHaveBeenCalledTimes(1)
  })

  it('saves textarea only on Cmd/Ctrl+Enter', () => {
    const onSave = vi.fn()

    render(
      <InlineEditField
        label="Notas"
        displayValue="Linea 1"
        variant="textarea"
        editable
        isEditing
        isSaving={false}
        draftValue="Linea 1"
        onDraftChange={() => {}}
        onStartEdit={() => {}}
        onCancel={() => {}}
        onSave={onSave}
      />,
    )

    const textarea = screen.getByRole('textbox')
    fireEvent.keyDown(textarea, { key: 'Enter' })
    expect(onSave).toHaveBeenCalledTimes(0)

    fireEvent.keyDown(textarea, { key: 'Enter', ctrlKey: true })
    expect(onSave).toHaveBeenCalledTimes(1)
  })

  it('saves select field on Enter after choosing an option', () => {
    const onSave = vi.fn()

    const Harness = () => {
      const [draft, setDraft] = useState('')
      return (
        <InlineEditField
          label="Estado"
          displayValue={draft || 'Sin dato'}
          variant="select"
          editable
          isEditing
          isSaving={false}
          draftValue={draft}
          options={[
            { value: 'DRAFT', label: 'Borrador' },
            { value: 'SUBMITTED', label: 'Enviado' },
          ]}
          onDraftChange={setDraft}
          onStartEdit={() => {}}
          onCancel={() => {}}
          onSave={onSave}
        />
      )
    }

    render(<Harness />)

    const trigger = screen.getByRole('combobox')
    fireEvent.keyDown(trigger, { key: 'Enter' })
    expect(onSave).toHaveBeenCalledTimes(0)

    fireEvent.click(trigger)
    fireEvent.click(screen.getByRole('option', { name: 'Borrador' }))

    fireEvent.keyDown(screen.getByRole('combobox'), { key: 'Enter' })
    expect(onSave).toHaveBeenCalledTimes(1)
  })

  it('saves async-combobox field on Enter after choosing an option', () => {
    const onSave = vi.fn()
    vi.stubGlobal('ResizeObserver', ResizeObserverMock)
    Object.defineProperty(window.HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: vi.fn(),
    })

    const Harness = () => {
      const [draft, setDraft] = useState('')
      return (
        <InlineEditField
          label="Poliza"
          displayValue={draft || 'Sin dato'}
          variant="async-combobox"
          editable
          isEditing
          isSaving={false}
          draftValue={draft}
          options={[
            { value: 'p1', label: 'POL-001 · Acme' },
            { value: 'p2', label: 'POL-002 · Acme' },
          ]}
          optionsSearch=""
          onOptionsSearchChange={() => {}}
          onDraftChange={setDraft}
          onStartEdit={() => {}}
          onCancel={() => {}}
          onSave={onSave}
        />
      )
    }

    render(<Harness />)

    const trigger = screen.getByRole('combobox')
    fireEvent.keyDown(trigger, { key: 'Enter' })
    expect(onSave).toHaveBeenCalledTimes(0)

    fireEvent.click(trigger)
    fireEvent.click(screen.getByRole('option', { name: 'POL-001 · Acme' }))

    fireEvent.keyDown(screen.getByRole('combobox'), { key: 'Enter' })
    expect(onSave).toHaveBeenCalledTimes(1)
  })
})
