import { addDays, differenceInCalendarDays } from './localDate'
import type { LocalDate } from './types'

export const MAX_FORECAST_PERIOD_DAYS = 10

export function forecastPeriodDays(averagePeriodDuration: number): number {
  const rounded = Math.round(averagePeriodDuration)
  if (!Number.isFinite(rounded)) {
    return 5
  }
  return Math.min(MAX_FORECAST_PERIOD_DAYS, Math.max(1, rounded))
}

export type CycleConfidence = 'insufficient' | 'low' | 'medium' | 'high'
export type CyclePhase =
  'menstrual' | 'follicular' | 'fertile' | 'ovulatory' | 'luteal' | 'unknown'

export interface CycleDateRange {
  startDate: LocalDate
  endDate?: LocalDate
}

export interface CycleStats {
  estimatedLength: number | null
  variability: number | null
  sampleSize: number
  confidence: CycleConfidence
}

export interface CycleCalculatorInput {
  cycles: readonly CycleDateRange[]
  selectedDate: LocalDate
  averageCycleLength: number
  averagePeriodDuration: number
  lutealPhaseLength?: number
}

export interface CycleInsights {
  cycleDay: number | null
  selectedCycle: CycleDateRange | null
  estimatedCycleLength: number | null
  variability: number | null
  confidence: CycleConfidence
  period: {
    start: LocalDate
    end: LocalDate
    endIsEstimated: boolean
  } | null
  phase: CyclePhase
  nextExpectedPeriod: LocalDate | null
  estimatedOvulation: LocalDate | null
  fertileWindow: { start: LocalDate; end: LocalDate } | null
}

function median(values: readonly number[]): number {
  const sorted = [...values].sort((left, right) => left - right)
  const middle = Math.floor(sorted.length / 2)
  const upper = sorted[middle]
  if (upper === undefined) return Number.NaN
  if (sorted.length % 2 === 1) return upper
  const lower = sorted[middle - 1]
  return lower === undefined ? upper : (lower + upper) / 2
}

function uniqueRecentStarts(cycles: readonly CycleDateRange[]): LocalDate[] {
  return [...new Set(cycles.map(({ startDate }) => startDate).sort())].slice(-6)
}

export function calculateCycleDay(
  date: LocalDate,
  cycleStart: LocalDate,
): number | null {
  const difference = differenceInCalendarDays(date, cycleStart)
  return difference < 0 ? null : difference + 1
}

export function findCycleForDate(
  cycles: readonly CycleDateRange[],
  date: LocalDate,
): CycleDateRange | null {
  return (
    [...cycles]
      .filter(({ startDate }) => startDate <= date)
      .sort((left, right) =>
        right.startDate.localeCompare(left.startDate),
      )[0] ?? null
  )
}

export function estimateCycleStats(
  cycles: readonly CycleDateRange[],
): CycleStats {
  const starts = uniqueRecentStarts(cycles)
  const lengths = starts
    .slice(1)
    .map((start, index) => {
      const previousStart = starts[index]
      return previousStart === undefined
        ? 0
        : differenceInCalendarDays(start, previousStart)
    })
    .filter((length) => length > 0)

  if (lengths.length === 0) {
    return {
      estimatedLength: null,
      variability: null,
      sampleSize: 0,
      confidence: 'insufficient',
    }
  }

  const rawMedian = median(lengths)
  const variability = median(
    lengths.map((length) => Math.abs(length - rawMedian)),
  )
  const confidence: CycleConfidence =
    variability > 7
      ? 'low'
      : lengths.length >= 4 && variability <= 3
        ? 'high'
        : lengths.length >= 2
          ? 'medium'
          : 'low'

  return {
    estimatedLength: Math.round(rawMedian),
    variability,
    sampleSize: lengths.length,
    confidence,
  }
}

export function calculateCycleInsights(
  input: CycleCalculatorInput,
): CycleInsights {
  const stats = estimateCycleStats(input.cycles)
  const selectedCycle = findCycleForDate(input.cycles, input.selectedDate)
  if (selectedCycle === null) {
    return {
      cycleDay: null,
      selectedCycle: null,
      estimatedCycleLength: stats.estimatedLength,
      variability: stats.variability,
      confidence: stats.confidence,
      period: null,
      phase: 'unknown',
      nextExpectedPeriod: null,
      estimatedOvulation: null,
      fertileWindow: null,
    }
  }

  const predictionLength =
    stats.estimatedLength ?? Math.round(input.averageCycleLength)
  const lutealLength = Math.min(
    17,
    Math.max(10, Math.round(input.lutealPhaseLength ?? 14)),
  )
  const forecastDays = forecastPeriodDays(input.averagePeriodDuration)
  const periodEnd =
    selectedCycle.endDate ??
    addDays(selectedCycle.startDate, forecastDays - 1)
  const nextExpectedPeriod = addDays(selectedCycle.startDate, predictionLength)
  const estimatedOvulation = addDays(nextExpectedPeriod, -lutealLength)
  const fertileWindow = {
    start: addDays(estimatedOvulation, -5),
    end: addDays(estimatedOvulation, 1),
  }
  const predictedPeriodEnd = addDays(nextExpectedPeriod, forecastDays - 1)
  const isBeyondPrediction = input.selectedDate > predictedPeriodEnd

  let phase: CyclePhase
  if (isBeyondPrediction) phase = 'unknown'
  else if (
    input.selectedDate >= nextExpectedPeriod &&
    input.selectedDate <= predictedPeriodEnd
  )
    phase = 'menstrual'
  else if (input.selectedDate <= periodEnd) phase = 'menstrual'
  else if (input.selectedDate < fertileWindow.start) phase = 'follicular'
  else if (input.selectedDate === estimatedOvulation) phase = 'ovulatory'
  else if (input.selectedDate <= fertileWindow.end) phase = 'fertile'
  else phase = 'luteal'

  return {
    cycleDay: isBeyondPrediction
      ? null
      : calculateCycleDay(input.selectedDate, selectedCycle.startDate),
    selectedCycle,
    estimatedCycleLength: stats.estimatedLength,
    variability: stats.variability,
    confidence: stats.confidence,
    period: {
      start: selectedCycle.startDate,
      end: periodEnd,
      endIsEstimated: selectedCycle.endDate === undefined,
    },
    phase,
    nextExpectedPeriod,
    estimatedOvulation,
    fertileWindow,
  }
}
