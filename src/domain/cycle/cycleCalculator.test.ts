import { describe, expect, it } from 'vitest'
import { createLocalDate, type LocalDate } from './types'
import {
  calculateCycleDay,
  calculateCycleInsights,
  estimateCycleStats,
  findCycleForDate,
} from './cycleCalculator'

const d = (value: string): LocalDate => createLocalDate(value)
const cycle = (startDate: string, endDate?: string) => ({
  startDate: d(startDate),
  ...(endDate === undefined ? {} : { endDate: d(endDate) }),
})

describe('cycle calculator', () => {
  it('calculates inclusive cycle days and selected cycles', () => {
    const cycles = [cycle('2025-12-20'), cycle('2026-01-18')]
    expect(calculateCycleDay(d('2026-01-20'), d('2026-01-18'))).toBe(3)
    expect(findCycleForDate(cycles, d('2026-01-10'))?.startDate).toBe(
      '2025-12-20',
    )
  })

  it('uses the median of recent unique starts and handles short and long cycles', () => {
    const cycles = [
      cycle('2025-08-01'),
      cycle('2025-08-22'),
      cycle('2025-09-26'),
      cycle('2025-10-24'),
      cycle('2025-11-21'),
      cycle('2025-12-19'),
      cycle('2025-12-19'),
    ]
    expect(estimateCycleStats(cycles)).toMatchObject({
      estimatedLength: 28,
      sampleSize: 5,
    })
  })

  it('uses only the last six unique starts for its estimate', () => {
    const cycles = [
      cycle('2025-01-01'),
      cycle('2025-01-11'),
      cycle('2025-01-21'),
      cycle('2025-02-20'),
      cycle('2025-03-22'),
      cycle('2025-04-21'),
      cycle('2025-05-21'),
      cycle('2025-06-20'),
    ]
    expect(estimateCycleStats(cycles)).toMatchObject({
      estimatedLength: 30,
      sampleSize: 5,
      variability: 0,
    })
  })

  it('reports insufficient confidence with only one cycle', () => {
    expect(estimateCycleStats([cycle('2026-01-01')])).toEqual({
      estimatedLength: null,
      variability: null,
      sampleSize: 0,
      confidence: 'insufficient',
    })
  })

  it('downgrades irregular histories honestly', () => {
    const cycles = [
      cycle('2025-09-01'),
      cycle('2025-09-21'),
      cycle('2025-11-05'),
      cycle('2025-11-25'),
      cycle('2026-01-09'),
    ]
    expect(estimateCycleStats(cycles).confidence).toBe('low')
  })

  it('predicts ovulation from the next period minus luteal length', () => {
    const result = calculateCycleInsights({
      cycles: [
        cycle('2025-10-01', '2025-10-05'),
        cycle('2025-10-31', '2025-11-04'),
        cycle('2025-11-30'),
      ],
      selectedDate: d('2025-12-15'),
      averageCycleLength: 28,
      averagePeriodDuration: 5,
      lutealPhaseLength: 12,
    })
    expect(result.nextExpectedPeriod).toBe('2025-12-30')
    expect(result.estimatedOvulation).toBe('2025-12-18')
    expect(result.fertileWindow).toEqual({
      start: '2025-12-13',
      end: '2025-12-19',
    })
    expect(result.phase).toBe('fertile')
  })

  it('caps a missing period end and the next forecast at 10 days', () => {
    const result = calculateCycleInsights({
      cycles: [cycle('2026-01-01')],
      selectedDate: d('2026-01-03'),
      averageCycleLength: 28,
      averagePeriodDuration: 20,
      lutealPhaseLength: 14,
    })
    expect(result.period).toEqual({
      start: '2026-01-01',
      end: '2026-01-10',
      endIsEstimated: true,
    })
    expect(result.phase).toBe('menstrual')
    expect(result.nextExpectedPeriod).toBe('2026-01-29')
    const forecastEnd = calculateCycleInsights({
      cycles: [cycle('2026-01-01')],
      selectedDate: d('2026-02-07'),
      averageCycleLength: 28,
      averagePeriodDuration: 20,
      lutealPhaseLength: 14,
    })
    expect(forecastEnd.phase).toBe('menstrual')
    const pastForecast = calculateCycleInsights({
      cycles: [cycle('2026-01-01')],
      selectedDate: d('2026-02-08'),
      averageCycleLength: 28,
      averagePeriodDuration: 20,
      lutealPhaseLength: 14,
    })
    expect(pastForecast.phase).toBe('unknown')

    const afterForecast = calculateCycleInsights({
      cycles: [cycle('2026-01-01')],
      selectedDate: d('2026-01-11'),
      averageCycleLength: 28,
      averagePeriodDuration: 20,
      lutealPhaseLength: 14,
    })
    expect(afterForecast.phase).not.toBe('menstrual')
  })

  it('keeps a manually logged period that is longer than 10 days', () => {
    const result = calculateCycleInsights({
      cycles: [cycle('2026-01-01', '2026-01-16')],
      selectedDate: d('2026-01-16'),
      averageCycleLength: 28,
      averagePeriodDuration: 5,
      lutealPhaseLength: 14,
    })
    expect(result.period).toEqual({
      start: '2026-01-01',
      end: '2026-01-16',
      endIsEstimated: false,
    })
    expect(result.phase).toBe('menstrual')
  })

  it('uses configured period duration without inventing a history end date', () => {
    const inputCycle = cycle('2024-02-28')
    const result = calculateCycleInsights({
      cycles: [inputCycle],
      selectedDate: d('2024-03-02'),
      averageCycleLength: 28,
      averagePeriodDuration: 5,
      lutealPhaseLength: 14,
    })
    expect(result.phase).toBe('menstrual')
    expect(result.period).toEqual({
      start: '2024-02-28',
      end: '2024-03-03',
      endIsEstimated: true,
    })
    expect(inputCycle.endDate).toBeUndefined()
  })

  it.each([
    ['2026-01-04', 'menstrual'],
    ['2026-01-05', 'follicular'],
    ['2026-01-11', 'fertile'],
    ['2026-01-16', 'ovulatory'],
    ['2026-01-17', 'fertile'],
    ['2026-01-18', 'luteal'],
    ['2026-01-30', 'menstrual'],
  ] as const)(
    'classifies %s at the expected phase boundary',
    (selectedDate, expectedPhase) => {
      const result = calculateCycleInsights({
        cycles: [
          cycle('2025-11-01', '2025-11-05'),
          cycle('2025-12-01', '2025-12-05'),
          cycle('2025-12-31', '2026-01-04'),
        ],
        selectedDate: d(selectedDate),
        averageCycleLength: 28,
        averagePeriodDuration: 5,
        lutealPhaseLength: 14,
      })
      expect(result.nextExpectedPeriod).toBe('2026-01-30')
      expect(result.fertileWindow).toEqual({
        start: '2026-01-11',
        end: '2026-01-17',
      })
      expect(result.estimatedOvulation).toBe('2026-01-16')
      expect(result.phase).toBe(expectedPhase)
    },
  )

  it('stops projecting after the predicted period window', () => {
    const result = calculateCycleInsights({
      cycles: [
        cycle('2025-11-01', '2025-11-05'),
        cycle('2025-12-01', '2025-12-05'),
        cycle('2025-12-31', '2026-01-04'),
      ],
      selectedDate: d('2026-02-05'),
      averageCycleLength: 28,
      averagePeriodDuration: 5,
      lutealPhaseLength: 14,
    })

    expect(result.phase).toBe('unknown')
    expect(result.cycleDay).toBeNull()
    expect(result.nextExpectedPeriod).toBe('2026-01-30')
  })
})
