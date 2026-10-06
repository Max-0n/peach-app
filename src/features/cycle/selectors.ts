import {
  assessPregnancyLikelihood,
  calculateCycleInsights,
  differenceInCalendarDays,
  estimateCycleStats,
  evaluateRedFlags,
  getRecommendations,
  todayLocalDate,
  type AppSettings,
  type CycleInsights,
  type LocalDate,
  type Recommendation,
  type RedFlagResult,
  type UserProfile,
} from '../../domain'
import type { AppRecords } from '../data/types'
import { toCycleRanges } from './ranges'

export function insightsForDate(
  records: AppRecords,
  settings: AppSettings | undefined,
  date: LocalDate,
): CycleInsights {
  return calculateCycleInsights({
    cycles: toCycleRanges(records.cycles),
    selectedDate: date,
    averageCycleLength: settings?.averageCycleLength ?? 28,
    averagePeriodDuration: settings?.averagePeriodDuration ?? 5,
    lutealPhaseLength: settings?.lutealPhaseLength ?? 14,
  })
}

export function todayInsights(
  records: AppRecords,
  settings: AppSettings | undefined,
  today = todayLocalDate(),
): CycleInsights {
  return insightsForDate(records, settings, today)
}

export function daysUntilNextPeriod(
  insights: CycleInsights,
  today = todayLocalDate(),
): number | null {
  if (insights.nextExpectedPeriod === null) {
    return null
  }
  return differenceInCalendarDays(insights.nextExpectedPeriod, today)
}

export function redFlagsForToday(
  records: AppRecords,
  profile: UserProfile | undefined,
  today = todayLocalDate(),
): RedFlagResult {
  const painNames = new Set([
    'cramps',
    'pelvicPain',
    'abdominalPain',
    'migraine',
    'backPain',
  ])
  const todaySymptoms = records.symptoms.filter((entry) => entry.date === today)
  const painSeverity = Math.max(
    0,
    ...todaySymptoms
      .filter((entry) => painNames.has(entry.symptom))
      .map((entry) => entry.severity),
  )
  const flow = records.flow.find((entry) => entry.date === today)
  const unusual = todaySymptoms.some(
    (entry) => entry.symptom === 'unusualDischarge' && entry.severity > 0,
  )
  const dizzy = todaySymptoms.some(
    (entry) => entry.symptom === 'dizziness' && entry.severity >= 4,
  )
  const fatigue = todaySymptoms.find((entry) => entry.symptom === 'fatigue')

  return evaluateRedFlags({
    ...(painSeverity > 0 ? { painSeverity } : {}),
    ...(flow === undefined ? {} : { bleeding: flow.flow }),
    ...(dizzy ? { fainting: true } : {}),
    ...(fatigue !== undefined && fatigue.severity >= 4
      ? { weaknessSeverity: fatigue.severity }
      : {}),
    ...(unusual ? { unusualSymptoms: true } : {}),
    ...(profile?.pregnancyMode === 'trying' ? { possiblePregnancy: true } : {}),
  })
}

export function recommendationsForToday(
  records: AppRecords,
  profile: UserProfile | undefined,
  insights: CycleInsights,
  today = todayLocalDate(),
): Recommendation[] {
  const todaySymptoms = records.symptoms.filter((entry) => entry.date === today)
  const mood = records.mood.find((entry) => entry.date === today)
  const starts = [...records.cycles.map((cycle) => cycle.startDate)].sort()
  const lengths = starts.slice(1).flatMap((start, index) => {
    const previous = starts[index]
    return previous === undefined
      ? []
      : [differenceInCalendarDays(start, previous)]
  })
  const sleepValue = mood?.sleep
  return getRecommendations({
    cyclePhase: insights.phase,
    symptoms: todaySymptoms.map((entry) => ({
      name: entry.symptom,
      severity: entry.severity,
    })),
    mood: mood?.mood ?? 'calm',
    energy: mood?.energy ?? 3,
    sleep: sleepValue === undefined ? 8 : sleepValue <= 2 ? 5 : 8,
    recentCycles: lengths.slice(-6),
    profile: { pregnancyMode: profile?.pregnancyMode ?? 'tracking' },
  })
}

export function likelihoodForDate(
  records: AppRecords,
  profile: UserProfile | undefined,
  insights: CycleInsights,
  date: LocalDate,
) {
  const activity = records.sexualActivity.find((entry) => entry.date === date)
  return assessPregnancyLikelihood({
    date,
    fertileWindow: insights.fertileWindow,
    pregnancyMode: profile?.pregnancyMode ?? 'tracking',
    ...(activity === undefined
      ? {}
      : {
          sexualActivity: {
            occurred: true,
            ...(activity.protection === undefined
              ? {}
              : { protection: activity.protection }),
          },
        }),
  })
}

export function cycleStatsFor(records: AppRecords) {
  const stats = estimateCycleStats(toCycleRanges(records.cycles))
  const starts = [...records.cycles.map((cycle) => cycle.startDate)].sort()
  const lengths = starts.slice(1).flatMap((start, index) => {
    const previous = starts[index]
    return previous === undefined
      ? []
      : [differenceInCalendarDays(start, previous)]
  })
  return {
    ...stats,
    shortest: lengths.length === 0 ? null : Math.min(...lengths),
    longest: lengths.length === 0 ? null : Math.max(...lengths),
  }
}
