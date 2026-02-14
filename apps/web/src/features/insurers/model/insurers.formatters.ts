const DATE_FORMAT_OPTIONS = {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
} as const

const DATE_TIME_FORMAT_OPTIONS = {
  ...DATE_FORMAT_OPTIONS,
  hour: '2-digit',
  minute: '2-digit',
} as const

export function formatInsurerDateOnly(value: string): string {
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return value

  return date.toLocaleDateString('es', DATE_FORMAT_OPTIONS)
}

export function formatInsurerDateTime(
  value: string,
  mode: 'date' | 'datetime' = 'date',
): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  if (mode === 'datetime') {
    return date.toLocaleString('es', DATE_TIME_FORMAT_OPTIONS)
  }

  return date.toLocaleDateString('es', DATE_FORMAT_OPTIONS)
}

export const INSURER_TYPE_LABELS = {
  MEDICINA_PREPAGADA: 'Medicina prepagada',
  COMPANIA_DE_SEGUROS: 'Compañía de seguros',
} as const

export function formatInsurerType(
  value: keyof typeof INSURER_TYPE_LABELS,
): string {
  return INSURER_TYPE_LABELS[value]
}
