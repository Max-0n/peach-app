import { z } from 'zod'
import {
  localDateSchema,
  severitySchema,
  symptomNameSchema,
} from '../../domain'

export const flowIntensitySchema = z.enum([
  'spotting',
  'light',
  'medium',
  'heavy',
])

export const moodScoreSchema = z.number().int().min(1).max(5)

export const periodRangeSchema = z
  .object({
    startDate: localDateSchema,
    endDate: localDateSchema.optional(),
  })
  .refine(
    ({ startDate, endDate }) => endDate === undefined || endDate >= startDate,
    { message: 'periodRange', path: ['endDate'] },
  )

export const dayLogSchema = z
  .object({
    date: localDateSchema,
    flow: flowIntensitySchema.optional(),
    symptoms: z
      .array(
        z.object({
          symptom: symptomNameSchema,
          severity: severitySchema.min(1),
        }),
      )
      .optional(),
    mood: z
      .object({
        moodScore: moodScoreSchema,
        energy: moodScoreSchema.optional(),
        sleep: moodScoreSchema.optional(),
        stress: moodScoreSchema.optional(),
      })
      .optional(),
    weightKg: z.number().positive().max(500).optional(),
    note: z.string().trim().min(1).max(10_000).optional(),
    sexualActivity: z
      .object({
        activity: z.enum(['intercourse', 'other']),
        protection: z
          .enum([
            'none',
            'condom',
            'contraception',
            'condomAndContraception',
            'unknown',
          ])
          .optional(),
      })
      .optional(),
  })
  .refine(
    (value) =>
      value.flow !== undefined ||
      (value.symptoms !== undefined && value.symptoms.length > 0) ||
      value.mood !== undefined ||
      value.weightKg !== undefined ||
      value.note !== undefined ||
      value.sexualActivity !== undefined,
    { message: 'empty' },
  )

export type PeriodRangeInput = z.infer<typeof periodRangeSchema>
export type DayLogInput = z.infer<typeof dayLogSchema>

export const moodFromScore = [
  'low',
  'anxious',
  'sensitive',
  'calm',
  'happy',
] as const
