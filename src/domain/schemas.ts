import { z } from 'zod'
import { localDateSchema } from './cycle/types'

export const SCHEMA_VERSION = 1 as const
export const isoInstantSchema = z.iso.datetime({ offset: true })

const persistentRecordSchema = z.strictObject({
  id: z.string().min(1),
  createdAt: isoInstantSchema,
  updatedAt: isoInstantSchema,
  revision: z.number().int().min(1),
  sourceId: z.string().min(1),
  schemaVersion: z.literal(SCHEMA_VERSION),
})

export const pregnancyModeSchema = z.enum(['trying', 'avoiding', 'tracking'])

export const userProfileSchema = persistentRecordSchema.extend({
  pregnancyMode: pregnancyModeSchema,
  birthDate: localDateSchema.optional(),
  heightCm: z.number().positive().optional(),
  displayName: z.string().trim().min(1).optional(),
  targetWeightKg: z.number().positive().max(500).optional(),
})

export const appSettingsSchema = persistentRecordSchema.extend({
  averagePeriodDuration: z
    .number()
    .int()
    .min(1)
    .max(50)
    .transform((days) => Math.min(10, days))
    .default(5),
  averageCycleLength: z.number().int().min(1).max(50).default(28),
  lutealPhaseLength: z.number().int().min(10).max(17).default(14),
  locale: z.enum(['en', 'ru']).default('ru'),
  theme: z.enum(['system', 'light', 'dark']).default('system'),
  onboardingCompleted: z.boolean().default(false),
})

export const cycleSchema = persistentRecordSchema
  .extend({
    startDate: localDateSchema,
    endDate: localDateSchema.optional(),
  })
  .refine(
    ({ startDate, endDate }) => endDate === undefined || endDate >= startDate,
    { message: 'Cycle end cannot precede start', path: ['endDate'] },
  )

const datedEntrySchema = persistentRecordSchema.extend({
  date: localDateSchema,
  notes: z.string().max(2_000).optional(),
})

export const flowEntrySchema = datedEntrySchema.extend({
  flow: z.enum(['spotting', 'light', 'medium', 'heavy']),
})

export const symptomNames = [
  'abdominalPain',
  'acne',
  'anxiety',
  'backPain',
  'bloating',
  'breastTenderness',
  'constipation',
  'cramps',
  'cravings',
  'decreasedAppetite',
  'diarrhea',
  'dizziness',
  'fatigue',
  'headache',
  'hotFlashes',
  'increasedAppetite',
  'insomnia',
  'irritability',
  'lowMood',
  'migraine',
  'moodSwings',
  'nausea',
  'nightSweats',
  'pelvicPain',
  'spotting',
  'unusualDischarge',
] as const

export const symptomNameSchema = z.enum(symptomNames)
export const severitySchema = z.number().int().min(0).max(4)

export const symptomEntrySchema = datedEntrySchema.extend({
  symptom: symptomNameSchema,
  severity: severitySchema,
})

export const moodEntrySchema = datedEntrySchema.extend({
  mood: z.enum([
    'calm',
    'happy',
    'energetic',
    'sensitive',
    'irritable',
    'anxious',
    'low',
  ]),
  intensity: severitySchema.optional(),
  moodScore: z.number().int().min(1).max(5).optional(),
  energy: z.number().int().min(1).max(5).optional(),
  sleep: z.number().int().min(1).max(5).optional(),
  stress: z.number().int().min(1).max(5).optional(),
})

export const weightEntrySchema = datedEntrySchema.extend({
  weightKg: z.number().positive().max(500),
})

export const noteEntrySchema = datedEntrySchema.omit({ notes: true }).extend({
  text: z.string().trim().min(1).max(10_000),
})

export const sexualActivityEntrySchema = datedEntrySchema.extend({
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

export const syncRecordSchema = persistentRecordSchema
  .extend({
    recordType: z.enum([
      'profile',
      'settings',
      'cycle',
      'flow',
      'symptom',
      'mood',
      'weight',
      'note',
      'sexualActivity',
    ]),
    recordId: z.string().min(1),
    deleted: z.boolean().default(false),
    deletedAt: isoInstantSchema.optional(),
  })
  .refine(({ deleted, deletedAt }) => deleted === (deletedAt !== undefined), {
    message: 'deleted and deletedAt must describe the same tombstone state',
    path: ['deletedAt'],
  })

export const appManifestSchema = z.strictObject({
  schemaVersion: z.literal(SCHEMA_VERSION),
  exportedAt: isoInstantSchema,
  sourceId: z.string().min(1),
})

export type UserProfile = z.infer<typeof userProfileSchema>
export type AppSettings = z.infer<typeof appSettingsSchema>
export type Cycle = z.infer<typeof cycleSchema>
export type FlowEntry = z.infer<typeof flowEntrySchema>
export type SymptomEntry = z.infer<typeof symptomEntrySchema>
export type SymptomName = z.infer<typeof symptomNameSchema>
export type MoodEntry = z.infer<typeof moodEntrySchema>
export type WeightEntry = z.infer<typeof weightEntrySchema>
export type NoteEntry = z.infer<typeof noteEntrySchema>
export type SexualActivityEntry = z.infer<typeof sexualActivityEntrySchema>
export type SyncRecord = z.infer<typeof syncRecordSchema>
export type AppManifest = z.infer<typeof appManifestSchema>
export type PregnancyMode = z.infer<typeof pregnancyModeSchema>
export type IsoInstant = z.infer<typeof isoInstantSchema>
