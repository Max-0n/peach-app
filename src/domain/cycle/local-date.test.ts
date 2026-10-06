import { describe, expect, it } from 'vitest'
import {
  addDays,
  compareLocalDates,
  differenceInCalendarDays,
  formatLocalDate,
  parseLocalDate,
} from './localDate'
import { createLocalDate } from './types'

describe('local cycle dates', () => {
  it('accepts a real calendar date in YYYY-MM-DD format', () => {
    expect(createLocalDate('2024-02-29')).toBe('2024-02-29')
  })

  it.each(['2023-02-29', '2024-2-9', 'not-a-date'])(
    'rejects invalid local date %s',
    (value) => {
      expect(() => createLocalDate(value)).toThrow('Invalid local date')
    },
  )

  it.each(['0000-01-01', '0001-01-01', '0099-12-31'])(
    'rejects unsupported early Gregorian year %s',
    (value) => {
      expect(() => createLocalDate(value)).toThrow('Invalid local date')
    },
  )

  it('parses and formats local calendar components without UTC conversion', () => {
    const date = createLocalDate('2026-01-02')
    expect(parseLocalDate(date)).toEqual({ year: 2026, month: 1, day: 2 })
    expect(formatLocalDate({ year: 2026, month: 1, day: 2 })).toBe(date)
  })

  it('compares and measures calendar dates', () => {
    const earlier = createLocalDate('2025-12-31')
    const later = createLocalDate('2026-01-02')
    expect(compareLocalDates(earlier, later)).toBe(-1)
    expect(differenceInCalendarDays(later, earlier)).toBe(2)
  })

  it('adds days across month, year, and leap boundaries', () => {
    expect(addDays(createLocalDate('2024-02-28'), 1)).toBe('2024-02-29')
    expect(addDays(createLocalDate('2024-02-29'), 1)).toBe('2024-03-01')
    expect(addDays(createLocalDate('2025-12-31'), 1)).toBe('2026-01-01')
    expect(addDays(createLocalDate('2026-01-01'), -1)).toBe('2025-12-31')
  })

  it('uses calendar arithmetic across the Pacific/Apia skipped local date', () => {
    expect(addDays(createLocalDate('2011-12-29'), 1)).toBe('2011-12-30')
    expect(addDays(createLocalDate('2011-12-30'), 1)).toBe('2011-12-31')
  })

  it.each([0.5, Number.NaN, Number.POSITIVE_INFINITY])(
    'rejects invalid day amount %s',
    (amount) => {
      expect(() => addDays(createLocalDate('2026-01-01'), amount)).toThrow(
        'Day amount must be a finite integer',
      )
    },
  )

  it('stays invariant across dates affected by timezone and DST offsets', () => {
    const springForward = createLocalDate('2026-03-08')
    const fallBack = createLocalDate('2026-11-01')

    expect(addDays(springForward, 1)).toBe('2026-03-09')
    expect(addDays(fallBack, 1)).toBe('2026-11-02')
    expect(
      differenceInCalendarDays(createLocalDate('2026-03-09'), springForward),
    ).toBe(1)
    expect(
      differenceInCalendarDays(createLocalDate('2026-11-02'), fallBack),
    ).toBe(1)
  })
})
