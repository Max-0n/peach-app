import {
  addDays,
  formatLocalDate,
  monthLength,
  parseLocalDate,
  startOfMonth,
  todayLocalDate,
  weekdaySundayZero,
} from '../domain/cycle/localDate'
import { createLocalDate, type LocalDate } from '../domain/cycle/types'
import type { Locale } from '../app/i18n/dictionary'

export function eachDayOfInterval(
  start: LocalDate,
  end: LocalDate,
): LocalDate[] {
  if (end < start) {
    return []
  }
  const days: LocalDate[] = []
  let current = start
  while (current <= end) {
    days.push(current)
    current = addDays(current, 1)
  }
  return days
}

export function addCalendarMonths(value: LocalDate, amount: number): LocalDate {
  const { year, month } = parseLocalDate(value)
  const total = year * 12 + (month - 1) + amount
  const nextYear = Math.floor(total / 12)
  const nextMonth = (total % 12) + 1
  return formatLocalDate({ year: nextYear, month: nextMonth, day: 1 })
}

export function weekdayIndex(date: LocalDate, weekStartsOn: 0 | 1): number {
  const fromSunday = weekdaySundayZero(date)
  return weekStartsOn === 0 ? fromSunday : (fromSunday + 6) % 7
}

export function monthCells(
  month: LocalDate,
  weekStartsOn: 0 | 1,
): (LocalDate | null)[] {
  const start = startOfMonth(month)
  const length = monthLength(month)
  const leading = weekdayIndex(start, weekStartsOn)
  const cells: (LocalDate | null)[] = Array.from(
    { length: leading },
    () => null,
  )
  const { year, month: monthNumber } = parseLocalDate(start)
  for (let day = 1; day <= length; day += 1) {
    cells.push(formatLocalDate({ year, month: monthNumber, day }))
  }
  while (cells.length % 7 !== 0) {
    cells.push(null)
  }
  return cells
}

export function weekdayLabels(locale: Locale, weekStartsOn: 0 | 1): string[] {
  const formatter = new Intl.DateTimeFormat(
    locale === 'ru' ? 'ru-RU' : 'en-US',
    {
      weekday: 'short',
    },
  )
  const sunday = new Date(2024, 0, 7)
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(sunday)
    date.setDate(sunday.getDate() + ((index + weekStartsOn) % 7))
    return formatter.format(date)
  })
}

export function formatLocalDateDisplay(
  date: LocalDate,
  locale: Locale,
  options: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  },
): string {
  const { year, month, day } = parseLocalDate(date)
  return new Intl.DateTimeFormat(
    locale === 'ru' ? 'ru-RU' : 'en-US',
    options,
  ).format(new Date(year, month - 1, day))
}

export function monthTitle(date: LocalDate, locale: Locale): string {
  return formatLocalDateDisplay(date, locale, {
    month: 'long',
    year: 'numeric',
  })
}

export function defaultBirthDate(now = new Date()): LocalDate {
  const copy = new Date(now.getTime())
  copy.setFullYear(copy.getFullYear() - 10)
  return todayLocalDate(copy)
}

export function toDateInputValue(date: LocalDate): string {
  return date
}

export function fromDateInputValue(value: string): LocalDate | null {
  try {
    return createLocalDate(value)
  } catch {
    return null
  }
}
