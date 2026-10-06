import type { CyclePhase } from './cycle/cycleCalculator'
import type { PregnancyMode, SymptomName } from './schemas'

export type RecommendationCategory =
  'nutrition' | 'movement' | 'recovery' | 'lifestyle'

export interface Recommendation {
  id: string
  category: RecommendationCategory
  titleKey: string
  bodyKey: string
  bodyText: string
}

export interface RecommendationInput {
  cyclePhase: CyclePhase
  symptoms: readonly { name: SymptomName; severity: number }[]
  mood: string
  energy: number
  sleep: number
  recentCycles: readonly number[]
  profile: { pregnancyMode: PregnancyMode }
}

function recommendation(
  id: string,
  category: RecommendationCategory,
  bodyText: string,
): Recommendation {
  return {
    id,
    category,
    titleKey: `recommendation.${id}.title`,
    bodyKey: `recommendation.${id}.body`,
    bodyText,
  }
}

const symptomRecommendations: Partial<Record<SymptomName, Recommendation>> = {
  cramps: recommendation(
    'symptom.cramps',
    'recovery',
    'Gentle warmth and comfortable movement may help you feel supported.',
  ),
  bloating: recommendation(
    'symptom.bloating',
    'nutrition',
    'Regular meals and comfortable hydration may support day-to-day comfort.',
  ),
  fatigue: recommendation(
    'symptom.fatigue',
    'recovery',
    'Consider pacing activities and making room for rest when possible.',
  ),
  backPain: recommendation(
    'symptom.backPain',
    'movement',
    'Try comfortable mobility and change position if that feels supportive.',
  ),
}

const moodRecommendation = recommendation(
  'symptom.moodChanges',
  'lifestyle',
  'A gentler schedule and a check-in with someone you trust may feel supportive.',
)

const phaseBaseline: Record<CyclePhase, readonly Recommendation[]> = {
  menstrual: [
    recommendation(
      'phase.menstrual',
      'recovery',
      'Choose a pace that feels comfortable and allow extra recovery time.',
    ),
  ],
  follicular: [
    recommendation(
      'phase.follicular',
      'movement',
      'Build activity gradually and adjust it to your current energy.',
    ),
  ],
  fertile: [
    recommendation(
      'phase.fertile',
      'lifestyle',
      'Treat the fertile window as an estimate rather than a certainty.',
    ),
  ],
  ovulatory: [
    recommendation(
      'phase.ovulatory',
      'lifestyle',
      'Notice how you feel today and adjust plans without pressure.',
    ),
  ],
  luteal: [
    recommendation(
      'phase.luteal',
      'nutrition',
      'Regular meals and flexible routines may support steady energy.',
    ),
  ],
  unknown: [
    recommendation(
      'phase.unknown',
      'lifestyle',
      'Cycle timing is uncertain, so use current symptoms and energy as your guide.',
    ),
  ],
}

const generalBaseline: readonly Recommendation[] = [
  recommendation(
    'baseline.meals',
    'nutrition',
    'Choose regular, satisfying meals that fit your needs and preferences.',
  ),
  recommendation(
    'baseline.movement',
    'movement',
    'Choose movement that feels comfortable and stop if you feel unwell.',
  ),
  recommendation(
    'baseline.sleep',
    'recovery',
    'A consistent wind-down routine may support restorative sleep.',
  ),
]

export function getRecommendations(
  input: RecommendationInput,
): Recommendation[] {
  const candidates: Recommendation[] = []
  const prioritizedSymptoms = [...input.symptoms].sort(
    (left, right) => right.severity - left.severity,
  )
  for (const symptom of prioritizedSymptoms) {
    const matchingRecommendation = symptomRecommendations[symptom.name]
    if (matchingRecommendation !== undefined && symptom.severity > 0) {
      candidates.push(matchingRecommendation)
    }
  }
  if (input.energy <= 1) {
    const fatigueRecommendation = symptomRecommendations.fatigue
    if (fatigueRecommendation !== undefined)
      candidates.push(fatigueRecommendation)
  }
  if (['sensitive', 'irritable', 'anxious', 'low'].includes(input.mood)) {
    candidates.push(moodRecommendation)
  }
  if (input.sleep < 7) {
    candidates.push(
      recommendation(
        'recovery.lowSleep',
        'recovery',
        'Consider a lighter pace and an earlier wind-down when possible.',
      ),
    )
  }
  if (
    input.recentCycles.length >= 3 &&
    Math.max(...input.recentCycles) - Math.min(...input.recentCycles) >= 8
  ) {
    candidates.push(
      recommendation(
        'cycles.irregular',
        'lifestyle',
        'Recent cycle timing varies, so treat phase predictions as estimates.',
      ),
    )
  }
  if (input.profile.pregnancyMode === 'trying') {
    candidates.push(
      recommendation(
        'profile.trying',
        'lifestyle',
        'If pregnancy is possible, choose pregnancy-compatible options and ask a clinician when unsure.',
      ),
    )
  } else if (input.profile.pregnancyMode === 'avoiding') {
    candidates.push(
      recommendation(
        'profile.avoiding',
        'lifestyle',
        'Cycle timing cannot confirm contraception; consider a reliable protection method.',
      ),
    )
  }

  candidates.push(...phaseBaseline[input.cyclePhase], ...generalBaseline)
  const unique = new Map(candidates.map((item) => [item.id, item]))
  return [...unique.values()].slice(0, 6)
}

export type RedFlagReason =
  | 'severePain'
  | 'heavyBleeding'
  | 'fainting'
  | 'severeWeakness'
  | 'highFever'
  | 'unusualSymptoms'
  | 'possiblePregnancyPainOrBleeding'

export interface RedFlagInput {
  painSeverity?: number
  bleeding?: 'none' | 'spotting' | 'light' | 'medium' | 'heavy'
  bleedingSharplyIncreased?: boolean
  fainting?: boolean
  weaknessSeverity?: number
  temperatureC?: number
  unusualSymptoms?: boolean
  possiblePregnancy?: boolean
}

export interface RedFlagResult {
  hasRedFlags: boolean
  reasons: RedFlagReason[]
  actionKey: 'medicalSafety.seekPromptCare' | null
}

export function evaluateRedFlags(input: RedFlagInput): RedFlagResult {
  const reasons: RedFlagReason[] = []
  if ((input.painSeverity ?? 0) >= 4) reasons.push('severePain')
  if (input.bleeding === 'heavy' || input.bleedingSharplyIncreased === true)
    reasons.push('heavyBleeding')
  if (input.fainting === true) reasons.push('fainting')
  if ((input.weaknessSeverity ?? 0) >= 4) reasons.push('severeWeakness')
  if ((input.temperatureC ?? 0) >= 38) reasons.push('highFever')
  if (input.unusualSymptoms === true) reasons.push('unusualSymptoms')
  if (
    input.possiblePregnancy === true &&
    ((input.painSeverity ?? 0) > 0 ||
      (input.bleeding !== undefined && input.bleeding !== 'none'))
  ) {
    reasons.push('possiblePregnancyPainOrBleeding')
  }
  return {
    hasRedFlags: reasons.length > 0,
    reasons,
    actionKey: reasons.length > 0 ? 'medicalSafety.seekPromptCare' : null,
  }
}
