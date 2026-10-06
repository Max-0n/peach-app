import { describe, expect, it } from 'vitest'
import {
  addDays,
  appSettingsSchema,
  assessPregnancyLikelihood,
  calculateBmi,
  calculateCycleInsights,
  evaluateRedFlags,
  getRecommendations,
  userProfileSchema,
} from './index'

describe('domain public API', () => {
  it('exports schemas and pure domain services from one barrel', () => {
    expect(typeof addDays).toBe('function')
    expect(typeof calculateCycleInsights).toBe('function')
    expect(typeof assessPregnancyLikelihood).toBe('function')
    expect(typeof calculateBmi).toBe('function')
    expect(typeof getRecommendations).toBe('function')
    expect(typeof evaluateRedFlags).toBe('function')
    expect(userProfileSchema).toBeDefined()
    expect(appSettingsSchema).toBeDefined()
  })
})
