import { describe, expect, it } from 'vitest'
import { calculateCycleInsights } from './cycleCalculator'
import { addDays, differenceInCalendarDays } from './localDate'
import { createLocalDate, type LocalDate } from './types'

const d = (value: string): LocalDate => createLocalDate(value)
const cycles = [
  { startDate: d('2025-11-01'), endDate: d('2025-11-05') },
  { startDate: d('2025-12-01'), endDate: d('2025-12-05') },
  { startDate: d('2025-12-31'), endDate: d('2026-01-04') },
]

describe('timezone process case', () => {
  it('emits local-date and cycle boundaries', () => {
    const insights = calculateCycleInsights({
      cycles,
      selectedDate: d('2026-01-18'),
      averageCycleLength: 28,
      averagePeriodDuration: 5,
      lutealPhaseLength: 14,
    })
    const result = {
      leapDay: addDays(d('2024-02-28'), 1),
      afterLeapDay: addDays(d('2024-02-29'), 1),
      springDstDay: addDays(d('2026-03-08'), 1),
      fallDstDay: addDays(d('2026-11-01'), 1),
      apiaSkippedDay: addDays(d('2011-12-29'), 1),
      dayDifference: differenceInCalendarDays(d('2026-01-02'), d('2025-12-31')),
      periodEnd: insights.period?.end,
      fertileStart: insights.fertileWindow?.start,
      ovulation: insights.estimatedOvulation,
      fertileEnd: insights.fertileWindow?.end,
      nextPeriod: insights.nextExpectedPeriod,
    }

    expect(result).toEqual({
      leapDay: '2024-02-29',
      afterLeapDay: '2024-03-01',
      springDstDay: '2026-03-09',
      fallDstDay: '2026-11-02',
      apiaSkippedDay: '2011-12-30',
      dayDifference: 2,
      periodEnd: '2026-01-04',
      fertileStart: '2026-01-11',
      ovulation: '2026-01-16',
      fertileEnd: '2026-01-17',
      nextPeriod: '2026-01-30',
    })
    console.log(`TZ_RESULT:${JSON.stringify(result)}`)
  })
})
