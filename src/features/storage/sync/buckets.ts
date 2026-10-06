import type { MergeableRecord } from './merge'
import type { PeachDatabase } from '../db/PeachDatabase'
import {
  appSettingsSchema,
  cycleSchema,
  flowEntrySchema,
  moodEntrySchema,
  noteEntrySchema,
  sexualActivityEntrySchema,
  symptomEntrySchema,
  userProfileSchema,
  weightEntrySchema,
  type SyncRecord,
} from '../../../domain'
import { bucketForDate } from './merge'

export type EntityName =
  | 'profile'
  | 'settings'
  | 'cycle'
  | 'flow'
  | 'symptom'
  | 'mood'
  | 'weight'
  | 'note'
  | 'sexualActivity'

export interface BucketPayload {
  records: MergeableRecord[]
  tombstones: SyncRecord[]
}

export const TOMBSTONE_BUCKET = 'tombstones'

export function monthBounds(yearMonth: string): {
  start: string
  endExclusive: string
} {
  const match = /^(\d{4})_(\d{2})$/u.exec(yearMonth)
  if (match === null) {
    throw new Error('A YYYY_MM bucket suffix is required.')
  }
  const yearPart = match[1]
  const monthPart = match[2]
  if (yearPart === undefined || monthPart === undefined) {
    throw new Error('A YYYY_MM bucket suffix is required.')
  }
  const year = Number(yearPart)
  const month = Number(monthPart)
  const start = `${yearPart}-${monthPart}-01`
  if (month === 12) {
    return {
      start,
      endExclusive: `${(year + 1).toString().padStart(4, '0')}-01-01`,
    }
  }
  return {
    start,
    endExclusive: `${yearPart}-${(month + 1).toString().padStart(2, '0')}-01`,
  }
}

export function parseBucket(bucket: string): {
  entity: EntityName | 'tombstones'
  yearMonth?: string
} {
  if (
    bucket === 'profile' ||
    bucket === 'settings' ||
    bucket === TOMBSTONE_BUCKET
  ) {
    return { entity: bucket }
  }
  const match =
    /^(cycle|flow|symptom|mood|weight|note|sexualActivity)_(\d{4}_\d{2})$/u.exec(
      bucket,
    )
  if (match?.[1] === undefined) {
    throw new Error(`Unknown bucket: ${bucket}`)
  }
  const entity = match[1]
  const yearMonth = match[2]
  if (yearMonth === undefined) {
    return { entity: entity as EntityName }
  }
  return { entity: entity as EntityName, yearMonth }
}

export function bucketForRecord(
  entity: EntityName,
  record: MergeableRecord & { date?: string; startDate?: string },
): string {
  if (entity === 'profile' || entity === 'settings') return entity
  const date = entity === 'cycle' ? record.startDate : record.date
  if (date === undefined) {
    throw new Error('A local date is required to choose a bucket.')
  }
  return bucketForDate(entity, date)
}

function inMonth(
  records: readonly MergeableRecord[],
  entity: EntityName,
  yearMonth: string,
): MergeableRecord[] {
  const { start, endExclusive } = monthBounds(yearMonth)
  return records.filter((record) => {
    const date =
      entity === 'cycle'
        ? (record as { startDate?: string }).startDate
        : (record as { date?: string }).date
    return date !== undefined && date >= start && date < endExclusive
  })
}

export async function readAllRecords(
  db: PeachDatabase,
  entity: EntityName,
): Promise<MergeableRecord[]> {
  switch (entity) {
    case 'profile':
      return db.profiles.toArray()
    case 'settings':
      return db.settings.toArray()
    case 'cycle':
      return db.cycles.toArray()
    case 'flow':
      return db.flowEntries.toArray()
    case 'symptom':
      return db.symptomEntries.toArray()
    case 'mood':
      return db.moodEntries.toArray()
    case 'weight':
      return db.weightEntries.toArray()
    case 'note':
      return db.noteEntries.toArray()
    case 'sexualActivity':
      return db.sexualActivityEntries.toArray()
  }
}

export async function loadLocalBucket(
  db: PeachDatabase,
  bucket: string,
): Promise<BucketPayload> {
  const parsed = parseBucket(bucket)
  const tombstones = await db.tombstones.toArray()
  if (parsed.entity === 'tombstones') {
    return { records: [], tombstones }
  }
  const records = await readAllRecords(db, parsed.entity)
  return {
    records:
      parsed.yearMonth === undefined
        ? records
        : inMonth(records, parsed.entity, parsed.yearMonth),
    tombstones,
  }
}

export function parseRecord(entity: EntityName, record: unknown) {
  switch (entity) {
    case 'profile':
      return userProfileSchema.parse(record)
    case 'settings':
      return appSettingsSchema.parse(record)
    case 'cycle':
      return cycleSchema.parse(record)
    case 'flow':
      return flowEntrySchema.parse(record)
    case 'symptom':
      return symptomEntrySchema.parse(record)
    case 'mood':
      return moodEntrySchema.parse(record)
    case 'weight':
      return weightEntrySchema.parse(record)
    case 'note':
      return noteEntrySchema.parse(record)
    case 'sexualActivity':
      return sexualActivityEntrySchema.parse(record)
  }
}
