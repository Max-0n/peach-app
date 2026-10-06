import { createLocalDate, type LocalDate } from './types'

export interface LocalDateParts {
  year: number
  month: number
  day: number
}

const monthOffsets = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334]

function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
}

function daysBeforeYear(year: number): number {
  const previousYear = year - 1
  return (
    previousYear * 365 +
    Math.floor(previousYear / 4) -
    Math.floor(previousYear / 100) +
    Math.floor(previousYear / 400)
  )
}

function toOrdinal(value: LocalDate): number {
  const { year, month, day } = parseLocalDate(value)
  const monthOffset = monthOffsets[month - 1]
  if (monthOffset === undefined) throw new RangeError('Invalid local date')
  const leapAdjustment = isLeapYear(year) && month > 2 ? 1 : 0
  return daysBeforeYear(year) + monthOffset + leapAdjustment + day
}

function fromOrdinal(ordinal: number): LocalDate {
  const minimum = daysBeforeYear(100) + 1
  const maximum = daysBeforeYear(10_000)
  if (ordinal < minimum || ordinal > maximum) {
    throw new RangeError('Local date is outside supported years 0100-9999')
  }

  let low = 100
  let high = 9_999
  while (low <= high) {
    const middle = Math.floor((low + high) / 2)
    if (daysBeforeYear(middle + 1) < ordinal) low = middle + 1
    else if (daysBeforeYear(middle) >= ordinal) high = middle - 1
    else {
      let remaining = ordinal - daysBeforeYear(middle)
      let month = 1
      while (remaining > daysInMonth(middle, month)) {
        remaining -= daysInMonth(middle, month)
        month += 1
      }
      return formatLocalDate({ year: middle, month, day: remaining })
    }
  }
  throw new RangeError('Invalid local date ordinal')
}

function daysInMonth(year: number, month: number): number {
  if (month === 2) return isLeapYear(year) ? 29 : 28
  return [4, 6, 9, 11].includes(month) ? 30 : 31
}

export function parseLocalDate(value: LocalDate): LocalDateParts {
  return {
    year: Number(value.slice(0, 4)),
    month: Number(value.slice(5, 7)),
    day: Number(value.slice(8, 10)),
  }
}

export function formatLocalDate(parts: LocalDateParts): LocalDate {
  return createLocalDate(
    `${String(parts.year).padStart(4, '0')}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`,
  )
}

export function compareLocalDates(
  left: LocalDate,
  right: LocalDate,
): -1 | 0 | 1 {
  return left < right ? -1 : left > right ? 1 : 0
}

export function differenceInCalendarDays(
  left: LocalDate,
  right: LocalDate,
): number {
  return toOrdinal(left) - toOrdinal(right)
}

export function addDays(value: LocalDate, amount: number): LocalDate {
  if (!Number.isFinite(amount) || !Number.isInteger(amount)) {
    throw new TypeError('Day amount must be a finite integer')
  }
  return fromOrdinal(toOrdinal(value) + amount)
}

export function todayLocalDate(now = new Date()): LocalDate {
  return formatLocalDate({
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    day: now.getDate(),
  })
}

export function startOfMonth(value: LocalDate): LocalDate {
  const { year, month } = parseLocalDate(value)
  return formatLocalDate({ year, month, day: 1 })
}

export function weekdaySundayZero(value: LocalDate): number {
  const { year, month, day } = parseLocalDate(value)
  return new Date(year, month - 1, day).getDay()
}

export function monthLength(value: LocalDate): number {
  const { year, month } = parseLocalDate(value)
  return daysInMonth(year, month)
}
