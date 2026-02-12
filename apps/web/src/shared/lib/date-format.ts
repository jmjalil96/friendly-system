const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/
const DAY_FIRST_DATE_PATTERN = /^(\d{2})\/(\d{2})\/(\d{4})$/

function padToTwoDigits(value: number): string {
  return String(value).padStart(2, '0')
}

function isValidDateParts(year: number, month: number, day: number): boolean {
  if (year < 1000 || year > 9999) return false
  if (month < 1 || month > 12) return false
  if (day < 1 || day > 31) return false

  const candidate = new Date(Date.UTC(year, month - 1, day))
  return (
    candidate.getUTCFullYear() === year &&
    candidate.getUTCMonth() === month - 1 &&
    candidate.getUTCDate() === day
  )
}

export function isIsoDate(value: string): boolean {
  const match = ISO_DATE_PATTERN.exec(value.trim())
  if (!match) return false

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  return isValidDateParts(year, month, day)
}

export function isoDateToDayFirst(value: string): string {
  const match = ISO_DATE_PATTERN.exec(value.trim())
  if (!match) return value

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  if (!isValidDateParts(year, month, day)) return value

  return `${padToTwoDigits(day)}/${padToTwoDigits(month)}/${year}`
}

export function dayFirstDateToIso(value: string): string | null {
  const match = DAY_FIRST_DATE_PATTERN.exec(value.trim())
  if (!match) return null

  const day = Number(match[1])
  const month = Number(match[2])
  const year = Number(match[3])
  if (!isValidDateParts(year, month, day)) return null

  return `${year}-${padToTwoDigits(month)}-${padToTwoDigits(day)}`
}

export function isoDateToLocalDate(value: string): Date | null {
  const match = ISO_DATE_PATTERN.exec(value.trim())
  if (!match) return null

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  if (!isValidDateParts(year, month, day)) return null

  return new Date(year, month - 1, day)
}

export function localDateToIsoDate(value: Date): string {
  if (Number.isNaN(value.getTime())) {
    throw new Error('Invalid date')
  }

  const year = value.getFullYear()
  const month = value.getMonth() + 1
  const day = value.getDate()

  return `${year}-${padToTwoDigits(month)}-${padToTwoDigits(day)}`
}
