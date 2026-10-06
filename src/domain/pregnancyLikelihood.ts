import type { LocalDate } from './cycle/types'
import type { PregnancyMode } from './schemas'

export type PregnancyLikelihood = 'low' | 'moderate' | 'high' | 'unknown'

export interface SexualActivityContext {
  occurred: boolean
  protection?:
    'none' | 'condom' | 'contraception' | 'condomAndContraception' | 'unknown'
}

export interface PregnancyLikelihoodInput {
  date: LocalDate
  fertileWindow: { start: LocalDate; end: LocalDate } | null
  pregnancyMode: PregnancyMode
  sexualActivity?: SexualActivityContext
}

export interface PregnancyLikelihoodResult {
  category: PregnancyLikelihood
  isInFertileWindow: boolean | null
  showAvoidingWarning: boolean
  warningKey: 'pregnancyLikelihood.avoidingWarning' | null
}

export function assessPregnancyLikelihood(
  input: PregnancyLikelihoodInput,
): PregnancyLikelihoodResult {
  if (input.fertileWindow === null) {
    return {
      category: 'unknown',
      isInFertileWindow: null,
      showAvoidingWarning: false,
      warningKey: null,
    }
  }

  const isInFertileWindow =
    input.date >= input.fertileWindow.start &&
    input.date <= input.fertileWindow.end
  let category: PregnancyLikelihood = isInFertileWindow ? 'moderate' : 'low'

  if (input.sexualActivity?.occurred === false) category = 'low'
  if (
    isInFertileWindow &&
    input.sexualActivity?.occurred === true &&
    input.sexualActivity.protection === 'none'
  ) {
    category = 'high'
  }

  const showAvoidingWarning =
    input.pregnancyMode === 'avoiding' &&
    (category === 'moderate' || category === 'high')

  return {
    category,
    isInFertileWindow,
    showAvoidingWarning,
    warningKey: showAvoidingWarning
      ? 'pregnancyLikelihood.avoidingWarning'
      : null,
  }
}
