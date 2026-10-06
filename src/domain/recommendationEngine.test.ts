import { describe, expect, it } from 'vitest'
import {
  evaluateRedFlags,
  getRecommendations,
  type RecommendationInput,
} from './recommendationEngine'

const baseline: RecommendationInput = {
  cyclePhase: 'luteal',
  symptoms: [],
  mood: 'calm',
  energy: 3,
  sleep: 8,
  recentCycles: [28, 29, 28],
  profile: { pregnancyMode: 'tracking' },
}

describe('recommendation engine', () => {
  it('returns 3-6 deterministic, deduplicated phase recommendations', () => {
    const first = getRecommendations(baseline)
    const second = getRecommendations(baseline)
    expect(first).toEqual(second)
    expect(first.length).toBeGreaterThanOrEqual(3)
    expect(first.length).toBeLessThanOrEqual(6)
    expect(new Set(first.map(({ id }) => id)).size).toBe(first.length)
  })

  it('covers common symptoms with safe supportive language keys', () => {
    const recommendations = getRecommendations({
      ...baseline,
      symptoms: [
        { name: 'cramps', severity: 3 },
        { name: 'bloating', severity: 2 },
        { name: 'fatigue', severity: 3 },
        { name: 'backPain', severity: 2 },
      ],
      mood: 'irritable',
      energy: 1,
    })
    const ids = recommendations.map(({ id }) => id)
    expect(ids).toContain('symptom.cramps')
    expect(ids).toContain('symptom.bloating')
    expect(ids).toContain('symptom.fatigue')
    expect(ids).toContain('symptom.moodChanges')
    expect(ids).toContain('symptom.backPain')
    expect(
      recommendations.find(({ id }) => id === 'symptom.cramps')?.bodyText,
    ).toBe(
      'Gentle warmth and comfortable movement may help you feel supported.',
    )
  })

  it('prioritizes higher-severity symptoms', () => {
    const recommendations = getRecommendations({
      ...baseline,
      symptoms: [
        { name: 'bloating', severity: 1 },
        { name: 'backPain', severity: 2 },
        { name: 'cramps', severity: 4 },
      ],
    })
    expect(recommendations.slice(0, 3).map(({ id }) => id)).toEqual([
      'symptom.cramps',
      'symptom.backPain',
      'symptom.bloating',
    ])
  })

  it('uses sleep and irregular history as cautious recovery guidance', () => {
    const recommendations = getRecommendations({
      ...baseline,
      sleep: 5,
      recentCycles: [22, 35, 25, 40],
    })
    expect(
      recommendations.find(({ id }) => id === 'recovery.lowSleep')?.bodyText,
    ).toBe('Consider a lighter pace and an earlier wind-down when possible.')
    expect(
      recommendations.find(({ id }) => id === 'cycles.irregular')?.bodyText,
    ).toBe(
      'Recent cycle timing varies, so treat phase predictions as estimates.',
    )
  })

  it('adjusts safe lifestyle guidance for pregnancy mode', () => {
    const trying = getRecommendations({
      ...baseline,
      profile: { pregnancyMode: 'trying' },
    })
    const avoiding = getRecommendations({
      ...baseline,
      profile: { pregnancyMode: 'avoiding' },
    })
    expect(trying.find(({ id }) => id === 'profile.trying')?.bodyText).toBe(
      'If pregnancy is possible, choose pregnancy-compatible options and ask a clinician when unsure.',
    )
    expect(avoiding.find(({ id }) => id === 'profile.avoiding')?.bodyText).toBe(
      'Cycle timing cannot confirm contraception; consider a reliable protection method.',
    )
  })

  it('uses distinct baselines for each cycle phase', () => {
    const phaseIds = (
      ['menstrual', 'follicular', 'ovulatory', 'luteal'] as const
    ).map(
      (cyclePhase) =>
        getRecommendations({ ...baseline, cyclePhase }).find(({ id }) =>
          id.startsWith('phase.'),
        )?.id,
    )
    expect(phaseIds).toEqual([
      'phase.menstrual',
      'phase.follicular',
      'phase.ovulatory',
      'phase.luteal',
    ])
  })
})

describe('medical safety red flags', () => {
  it.each([
    [{ painSeverity: 4 }, 'severePain'],
    [{ bleeding: 'heavy' }, 'heavyBleeding'],
    [{ bleeding: 'medium', bleedingSharplyIncreased: true }, 'heavyBleeding'],
    [{ fainting: true }, 'fainting'],
    [{ weaknessSeverity: 4 }, 'severeWeakness'],
    [{ temperatureC: 39 }, 'highFever'],
    [{ unusualSymptoms: true }, 'unusualSymptoms'],
    [
      { possiblePregnancy: true, painSeverity: 2, bleeding: 'light' },
      'possiblePregnancyPainOrBleeding',
    ],
  ] as const)('flags %s', (input, expectedReason) => {
    const result = evaluateRedFlags(input)
    expect(result.hasRedFlags).toBe(true)
    expect(result.reasons).toContain(expectedReason)
    expect(result.actionKey).toBe('medicalSafety.seekPromptCare')
  })

  it('does not flag routine mild symptoms', () => {
    expect(evaluateRedFlags({ painSeverity: 1, bleeding: 'light' })).toEqual({
      hasRedFlags: false,
      reasons: [],
      actionKey: null,
    })
  })
})
