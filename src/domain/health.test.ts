import { describe, expect, it } from 'vitest'
import { calculateBmi, classifyBmi } from './bmi'
import { assessPregnancyLikelihood } from './pregnancyLikelihood'
import { createLocalDate } from './cycle/types'

const date = createLocalDate('2026-01-15')
const fertileWindow = {
  start: createLocalDate('2026-01-12'),
  end: createLocalDate('2026-01-18'),
}

describe('pregnancy likelihood', () => {
  it('keeps likelihood distinct from the fertile window', () => {
    expect(
      assessPregnancyLikelihood({
        date,
        fertileWindow,
        pregnancyMode: 'tracking',
      }).category,
    ).toBe('moderate')
  })

  it('accounts for activity and protection without percentages', () => {
    expect(
      assessPregnancyLikelihood({
        date,
        fertileWindow,
        pregnancyMode: 'tracking',
        sexualActivity: { occurred: true, protection: 'none' },
      }).category,
    ).toBe('high')
    expect(
      assessPregnancyLikelihood({
        date,
        fertileWindow,
        pregnancyMode: 'tracking',
        sexualActivity: { occurred: true, protection: 'contraception' },
      }).category,
    ).toBe('moderate')
  })

  it('returns unknown without a fertile estimate and flags avoiding guidance', () => {
    expect(
      assessPregnancyLikelihood({
        date,
        fertileWindow: null,
        pregnancyMode: 'tracking',
      }).category,
    ).toBe('unknown')
    expect(
      assessPregnancyLikelihood({
        date,
        fertileWindow,
        pregnancyMode: 'avoiding',
        sexualActivity: { occurred: true, protection: 'none' },
      }),
    ).toMatchObject({
      showAvoidingWarning: true,
      warningKey: 'pregnancyLikelihood.avoidingWarning',
    })
  })
})

describe('BMI', () => {
  it('returns a rounded BMI for valid metric input', () => {
    expect(calculateBmi({ heightCm: 170, weightKg: 65 })).toBe(22.5)
  })

  it('returns null for invalid or implausible measurements', () => {
    expect(calculateBmi({ heightCm: 0, weightKg: 65 })).toBeNull()
    expect(calculateBmi({ heightCm: 170, weightKg: Number.NaN })).toBeNull()
    expect(calculateBmi({ heightCm: 20, weightKg: 500 })).toBeNull()
  })

  it('offers classification separately from calculation', () => {
    expect(classifyBmi(22.5)).toBe('healthyRange')
    expect(classifyBmi(null)).toBeNull()
  })
})
