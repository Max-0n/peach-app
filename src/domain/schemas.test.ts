import { describe, expect, it } from 'vitest'
import type { ZodType } from 'zod'
import {
  appManifestSchema,
  appSettingsSchema,
  cycleSchema,
  flowEntrySchema,
  isoInstantSchema,
  moodEntrySchema,
  noteEntrySchema,
  SCHEMA_VERSION,
  sexualActivityEntrySchema,
  symptomEntrySchema,
  syncRecordSchema,
  userProfileSchema,
  weightEntrySchema,
} from './schemas'

const metadata = {
  id: 'record-1',
  createdAt: '2026-01-01T10:00:00.000Z',
  updatedAt: '2026-01-01T10:00:00.000Z',
  revision: 1,
  sourceId: 'device-1',
}

type SchemaCase = readonly [schema: ZodType, payload: Record<string, unknown>]

const versionedRecords: readonly SchemaCase[] = [
  [cycleSchema, { ...metadata, startDate: '2026-01-01' }],
  [flowEntrySchema, { ...metadata, date: '2026-01-01', flow: 'medium' }],
  [
    symptomEntrySchema,
    {
      ...metadata,
      date: '2026-01-01',
      symptom: 'cramps',
      severity: 2,
    },
  ],
  [moodEntrySchema, { ...metadata, date: '2026-01-01', mood: 'calm' }],
  [weightEntrySchema, { ...metadata, date: '2026-01-01', weightKg: 65 }],
  [noteEntrySchema, { ...metadata, date: '2026-01-01', text: 'A note' }],
  [
    sexualActivityEntrySchema,
    { ...metadata, date: '2026-01-01', activity: 'intercourse' },
  ],
  [
    syncRecordSchema,
    {
      ...metadata,
      recordType: 'cycle',
      recordId: 'cycle-1',
      deleted: false,
    },
  ],
] as const

const strictRecords: readonly SchemaCase[] = [
  [
    userProfileSchema,
    {
      ...metadata,
      schemaVersion: SCHEMA_VERSION,
      pregnancyMode: 'tracking',
    },
  ],
  [
    appSettingsSchema,
    {
      ...metadata,
      schemaVersion: SCHEMA_VERSION,
      averagePeriodDuration: 5,
      lutealPhaseLength: 14,
    },
  ],
  ...versionedRecords.map(
    ([schema, payload]) =>
      [schema, { ...payload, schemaVersion: SCHEMA_VERSION }] as const,
  ),
  [
    appManifestSchema,
    {
      schemaVersion: SCHEMA_VERSION,
      exportedAt: metadata.updatedAt,
      sourceId: metadata.sourceId,
    },
  ],
]

describe('versioned persistent schemas', () => {
  it('keeps ISO instants distinct from local dates', () => {
    expect(isoInstantSchema.safeParse('2026-01-01T10:00:00Z').success).toBe(
      true,
    )
    expect(isoInstantSchema.safeParse('2026-01-01').success).toBe(false)
  })

  it('validates profile pregnancy mode and metadata', () => {
    expect(
      userProfileSchema.parse({
        ...metadata,
        schemaVersion: 1,
        pregnancyMode: 'trying',
      }).pregnancyMode,
    ).toBe('trying')
    expect(
      userProfileSchema.safeParse({
        ...metadata,
        revision: 0,
        schemaVersion: 1,
        pregnancyMode: 'unknown',
      }).success,
    ).toBe(false)
  })

  it('validates settings and root manifest schema versions', () => {
    expect(
      appSettingsSchema.safeParse({
        ...metadata,
        schemaVersion: 1,
        averagePeriodDuration: 5,
        lutealPhaseLength: 14,
      }).success,
    ).toBe(true)
    expect(
      appManifestSchema.safeParse({
        schemaVersion: 1,
        exportedAt: metadata.updatedAt,
        sourceId: metadata.sourceId,
      }).success,
    ).toBe(true)
  })

  it('validates cycles and bounded entry values', () => {
    expect(
      cycleSchema.safeParse({
        ...metadata,
        schemaVersion: SCHEMA_VERSION,
        startDate: '2024-02-29',
        endDate: '2024-03-04',
      }).success,
    ).toBe(true)
    expect(
      flowEntrySchema.safeParse({
        ...metadata,
        schemaVersion: SCHEMA_VERSION,
        date: '2026-01-01',
        flow: 'heavy',
      }).success,
    ).toBe(true)
    expect(
      symptomEntrySchema.safeParse({
        ...metadata,
        schemaVersion: SCHEMA_VERSION,
        date: '2026-01-01',
        symptom: 'cramps',
        severity: 5,
      }).success,
    ).toBe(false)
  })

  it('supports sync metadata and tombstones', () => {
    expect(
      syncRecordSchema.safeParse({
        ...metadata,
        schemaVersion: SCHEMA_VERSION,
        recordType: 'cycle',
        recordId: 'cycle-1',
        deleted: true,
        deletedAt: metadata.updatedAt,
      }).success,
    ).toBe(true)
  })

  it('requires deleted and deletedAt to describe the same tombstone state', () => {
    const sync = {
      ...metadata,
      schemaVersion: SCHEMA_VERSION,
      recordType: 'cycle',
      recordId: 'cycle-1',
    }
    expect(
      syncRecordSchema.safeParse({
        ...sync,
        deleted: true,
      }).success,
    ).toBe(false)
    expect(
      syncRecordSchema.safeParse({
        ...sync,
        deleted: false,
        deletedAt: metadata.updatedAt,
      }).success,
    ).toBe(false)
  })

  it('keeps NoteEntry text without an inherited notes field', () => {
    expect(
      noteEntrySchema.safeParse({
        ...metadata,
        schemaVersion: SCHEMA_VERSION,
        date: '2026-01-01',
        text: 'A note',
      }).success,
    ).toBe(true)
    expect(
      noteEntrySchema.safeParse({
        ...metadata,
        schemaVersion: SCHEMA_VERSION,
        date: '2026-01-01',
        text: 'A note',
        notes: 'duplicate note storage',
      }).success,
    ).toBe(false)
  })

  it.each(versionedRecords)(
    'requires the current schema version on persisted records',
    (schema, payload) => {
      expect(schema.safeParse(payload).success).toBe(false)
      expect(
        schema.safeParse({
          ...payload,
          schemaVersion: SCHEMA_VERSION + 1,
        }).success,
      ).toBe(false)
      expect(
        schema.safeParse({
          ...payload,
          schemaVersion: SCHEMA_VERSION,
        }).success,
      ).toBe(true)
    },
  )

  it.each(strictRecords)(
    'rejects unknown fields instead of silently stripping them',
    (schema, payload) => {
      expect(
        schema.safeParse({ ...payload, misspelledField: true }).success,
      ).toBe(false)
    },
  )
})
