import { describe, expect, it } from 'vitest'
import {
  dayFirstDateToIso,
  isIsoDate,
  isoDateToLocalDate,
  isoDateToDayFirst,
  localDateToIsoDate,
} from '@/shared/lib/date-format'

describe('date-format', () => {
  it('formats valid ISO dates to day-first format', () => {
    expect(isoDateToDayFirst('2026-01-15')).toBe('15/01/2026')
  })

  it('keeps non-ISO values unchanged when formatting to day-first', () => {
    expect(isoDateToDayFirst('15/01/2026')).toBe('15/01/2026')
  })

  it('parses valid day-first values into ISO', () => {
    expect(dayFirstDateToIso('15/01/2026')).toBe('2026-01-15')
  })

  it('rejects invalid calendar dates in day-first format', () => {
    expect(dayFirstDateToIso('31/02/2026')).toBeNull()
  })

  it('validates ISO calendar dates strictly', () => {
    expect(isIsoDate('2026-01-15')).toBe(true)
    expect(isIsoDate('2026-02-31')).toBe(false)
  })

  it('converts ISO date to local date and back without day shift', () => {
    const localDate = isoDateToLocalDate('2026-01-15')
    expect(localDate).not.toBeNull()
    expect(localDateToIsoDate(localDate as Date)).toBe('2026-01-15')
  })

  it('normalizes local date values to ISO ignoring time of day', () => {
    const localDate = new Date(2026, 0, 15, 23, 59, 59)
    expect(localDateToIsoDate(localDate)).toBe('2026-01-15')
  })

  it('returns null for invalid ISO when converting to local date', () => {
    expect(isoDateToLocalDate('2026-02-31')).toBeNull()
  })
})
