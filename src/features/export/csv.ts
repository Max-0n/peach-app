import {
  calculateBmi,
  calculateCycleInsights,
  type LocalDate,
  type SymptomName,
  type Cycle,
  type FlowEntry,
  type MoodEntry,
  type NoteEntry,
  type PregnancyMode,
  type SexualActivityEntry,
  type SymptomEntry,
  type WeightEntry,
} from '../../domain'
import { toCycleRanges } from '../cycle/ranges'
import { eachDayOfInterval } from '../../lib/dates'

export const CSV_FILENAME = 'menstrual-tracker-export.csv'

export interface CsvExportInput {
  cycles: readonly Cycle[]
  flow: readonly FlowEntry[]
  symptoms: readonly SymptomEntry[]
  mood: readonly MoodEntry[]
  weight: readonly WeightEntry[]
  notes: readonly NoteEntry[]
  sexualActivity: readonly SexualActivityEntry[]
  averageCycleLength: number
  averagePeriodDuration: number
  lutealPhaseLength: number
  pregnancyMode: PregnancyMode
  heightCm?: number
}

const SYMPTOM_COLUMNS = [
  ['bloating', 'bloating'],
  ['breast_sensitivity', 'breastTenderness'],
  ['abdominal_pain', 'abdominalPain'],
  ['back_pain', 'backPain'],
  ['headache', 'headache'],
  ['fatigue', 'fatigue'],
  ['irritability', 'irritability'],
  ['anxiety', 'anxiety'],
  ['low_mood', 'lowMood'],
  ['cravings', 'cravings'],
  ['increased_appetite', 'increasedAppetite'],
  ['decreased_appetite', 'decreasedAppetite'],
  ['sleep_quality', 'insomnia'],
  ['acne', 'acne'],
  ['nausea', 'nausea'],
  ['diarrhea', 'diarrhea'],
  ['constipation', 'constipation'],
] as const satisfies readonly (readonly [string, SymptomName])[]

export const CSV_HEADER = [
  'date',
  'cycle_day',
  'cycle_phase',
  'period',
  'flow',
  'mood',
  'energy',
  'stress',
  'sleep',
  ...SYMPTOM_COLUMNS.map(([column]) => column),
  'weight_kg',
  'height_cm',
  'bmi',
  'sexual_activity',
  'protection',
  'note',
] as const

export function escapeCsvValue(value: string): string {
  if (/[",\n\r]/u.test(value)) {
    return `"${value.replaceAll('"', '""')}"`
  }
  return value
}

function uniqueDates(input: CsvExportInput): LocalDate[] {
  const dates = new Set<LocalDate>()
  for (const cycle of input.cycles) {
    dates.add(cycle.startDate)
    const end = cycle.endDate ?? cycle.startDate
    for (const date of eachDayOfInterval(cycle.startDate, end)) {
      dates.add(date)
    }
  }
  for (const collection of [
    input.flow,
    input.symptoms,
    input.mood,
    input.weight,
    input.notes,
    input.sexualActivity,
  ]) {
    for (const entry of collection) dates.add(entry.date)
  }
  return [...dates].sort()
}

export function buildCsv(input: CsvExportInput): string {
  const height = input.heightCm === undefined ? '' : String(input.heightCm)
  const rows = uniqueDates(input).map((date) => {
    const insights = calculateCycleInsights({
      cycles: toCycleRanges(input.cycles),
      selectedDate: date,
      averageCycleLength: input.averageCycleLength,
      averagePeriodDuration: input.averagePeriodDuration,
      lutealPhaseLength: input.lutealPhaseLength,
    })
    const flow = input.flow.find((entry) => entry.date === date)
    const inLoggedPeriod = input.cycles.some((cycle) => {
      const end = cycle.endDate ?? cycle.startDate
      return date >= cycle.startDate && date <= end
    })
    const mood = input.mood.find((entry) => entry.date === date)
    const weight = input.weight.find((entry) => entry.date === date)
    const note = input.notes.find((entry) => entry.date === date)
    const activity = input.sexualActivity.find((entry) => entry.date === date)
    const bmi =
      weight === undefined || input.heightCm === undefined
        ? null
        : calculateBmi({
            heightCm: input.heightCm,
            weightKg: weight.weightKg,
          })
    const symptomValues = Object.fromEntries(
      SYMPTOM_COLUMNS.map(([column, symptom]) => {
        const entry = input.symptoms.find(
          (item) => item.date === date && item.symptom === symptom,
        )
        return [column, entry === undefined ? '' : String(entry.severity)]
      }),
    )
    const period =
      inLoggedPeriod || flow !== undefined
        ? 'yes'
        : insights.phase === 'menstrual'
          ? 'predicted'
          : ''
    const values: Record<(typeof CSV_HEADER)[number], string> = {
      date,
      cycle_day: insights.cycleDay === null ? '' : String(insights.cycleDay),
      cycle_phase: insights.phase === 'unknown' ? '' : insights.phase,
      period,
      flow: flow?.flow ?? '',
      mood:
        mood?.moodScore === undefined
          ? (mood?.mood ?? '')
          : String(mood.moodScore),
      energy: mood?.energy === undefined ? '' : String(mood.energy),
      stress: mood?.stress === undefined ? '' : String(mood.stress),
      sleep: mood?.sleep === undefined ? '' : String(mood.sleep),
      bloating: symptomValues.bloating ?? '',
      breast_sensitivity: symptomValues.breast_sensitivity ?? '',
      abdominal_pain: symptomValues.abdominal_pain ?? '',
      back_pain: symptomValues.back_pain ?? '',
      headache: symptomValues.headache ?? '',
      fatigue: symptomValues.fatigue ?? '',
      irritability: symptomValues.irritability ?? '',
      anxiety: symptomValues.anxiety ?? '',
      low_mood: symptomValues.low_mood ?? '',
      cravings: symptomValues.cravings ?? '',
      increased_appetite: symptomValues.increased_appetite ?? '',
      decreased_appetite: symptomValues.decreased_appetite ?? '',
      sleep_quality: symptomValues.sleep_quality ?? '',
      acne: symptomValues.acne ?? '',
      nausea: symptomValues.nausea ?? '',
      diarrhea: symptomValues.diarrhea ?? '',
      constipation: symptomValues.constipation ?? '',
      weight_kg: weight === undefined ? '' : String(weight.weightKg),
      height_cm: height,
      bmi: bmi === null ? '' : String(bmi),
      sexual_activity: activity?.activity ?? '',
      protection: activity?.protection ?? '',
      note: note?.text ?? flow?.notes ?? '',
    }
    return CSV_HEADER.map((key) => escapeCsvValue(values[key])).join(',')
  })
  return `\uFEFF${[CSV_HEADER.join(','), ...rows].join('\n')}`
}
