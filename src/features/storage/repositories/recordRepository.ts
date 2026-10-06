import type { Table } from 'dexie'
import {
  SCHEMA_VERSION,
  syncRecordSchema,
  type AppSettings,
  type Cycle,
  type FlowEntry,
  type MoodEntry,
  type NoteEntry,
  type SexualActivityEntry,
  type SymptomEntry,
  type SyncRecord,
  type UserProfile,
  type WeightEntry,
} from '../../../domain'
import type { PeachDatabase } from '../db/PeachDatabase'
import {
  TOMBSTONE_BUCKET,
  bucketForRecord,
  parseRecord,
  type EntityName,
} from '../sync/buckets'
import { compareRecords, type MergeableRecord } from '../sync/merge'
import type { SyncQueue } from '../sync/queue'

export const PROFILE_ID = 'profile'
export const SETTINGS_ID = 'settings'

export interface RecordClock {
  now: () => Date
  sourceId: string
}

function iso(clock: RecordClock): string {
  return clock.now().toISOString()
}

function withRevision<T extends MergeableRecord>(
  incoming: T,
  existing: T | undefined,
  clock: RecordClock,
): T {
  return {
    ...incoming,
    createdAt: existing?.createdAt ?? incoming.createdAt ?? iso(clock),
    updatedAt: iso(clock),
    sourceId: clock.sourceId,
    revision:
      existing === undefined
        ? Math.max(incoming.revision, 1)
        : existing.revision + 1,
  }
}

export class RecordRepository {
  private readonly db: PeachDatabase
  private readonly clock: RecordClock
  private readonly queue: SyncQueue

  constructor(db: PeachDatabase, clock: RecordClock, queue: SyncQueue) {
    this.db = db
    this.clock = clock
    this.queue = queue
  }

  async saveProfile(
    input: Partial<
      Pick<
        UserProfile,
        | 'pregnancyMode'
        | 'birthDate'
        | 'heightCm'
        | 'displayName'
        | 'targetWeightKg'
        | 'id'
      >
    > = {},
  ): Promise<UserProfile> {
    const existing = await this.db.profiles.get(input.id ?? PROFILE_ID)
    const birthDate = input.birthDate ?? existing?.birthDate
    const heightCm = input.heightCm ?? existing?.heightCm
    const displayName = input.displayName ?? existing?.displayName
    const targetWeightKg = input.targetWeightKg ?? existing?.targetWeightKg
    const record = withRevision(
      {
        pregnancyMode:
          input.pregnancyMode ?? existing?.pregnancyMode ?? 'tracking',
        id: PROFILE_ID,
        createdAt: existing?.createdAt ?? iso(this.clock),
        updatedAt: iso(this.clock),
        revision: 1,
        sourceId: this.clock.sourceId,
        schemaVersion: SCHEMA_VERSION,
        ...(birthDate === undefined ? {} : { birthDate }),
        ...(heightCm === undefined ? {} : { heightCm }),
        ...(displayName === undefined ? {} : { displayName }),
        ...(targetWeightKg === undefined ? {} : { targetWeightKg }),
      },
      existing,
      this.clock,
    )
    await this.db.profiles.put(record)
    await this.queue.enqueue('profile')
    return record
  }

  async getProfile(): Promise<UserProfile | undefined> {
    return this.db.profiles.get(PROFILE_ID)
  }

  async saveSettings(
    input: Partial<
      Pick<
        AppSettings,
        | 'averagePeriodDuration'
        | 'averageCycleLength'
        | 'lutealPhaseLength'
        | 'locale'
        | 'theme'
        | 'onboardingCompleted'
      >
    > = {},
  ): Promise<AppSettings> {
    const existing = await this.db.settings.get(SETTINGS_ID)
    const record = withRevision(
      {
        id: SETTINGS_ID,
        createdAt: existing?.createdAt ?? iso(this.clock),
        updatedAt: iso(this.clock),
        revision: 1,
        sourceId: this.clock.sourceId,
        schemaVersion: SCHEMA_VERSION,
        averagePeriodDuration:
          input.averagePeriodDuration ?? existing?.averagePeriodDuration ?? 5,
        averageCycleLength:
          input.averageCycleLength ?? existing?.averageCycleLength ?? 28,
        lutealPhaseLength:
          input.lutealPhaseLength ?? existing?.lutealPhaseLength ?? 14,
        locale: input.locale ?? existing?.locale ?? 'ru',
        theme: input.theme ?? existing?.theme ?? 'system',
        onboardingCompleted:
          input.onboardingCompleted ?? existing?.onboardingCompleted ?? false,
      },
      existing,
      this.clock,
    )
    await this.db.settings.put(record)
    await this.queue.enqueue('settings')
    return record
  }

  async getSettings(): Promise<AppSettings | undefined> {
    return this.db.settings.get(SETTINGS_ID)
  }

  async saveCycle(
    input: Omit<
      Cycle,
      'createdAt' | 'updatedAt' | 'revision' | 'sourceId' | 'schemaVersion'
    > &
      Partial<Pick<Cycle, 'createdAt' | 'updatedAt' | 'revision' | 'sourceId'>>,
  ): Promise<Cycle> {
    return this.saveDated('cycle', this.db.cycles, input)
  }

  async listCycles(): Promise<Cycle[]> {
    return this.db.cycles.orderBy('startDate').toArray()
  }

  async saveFlow(
    input: Omit<
      FlowEntry,
      'createdAt' | 'updatedAt' | 'revision' | 'sourceId' | 'schemaVersion'
    > &
      Partial<
        Pick<FlowEntry, 'createdAt' | 'updatedAt' | 'revision' | 'sourceId'>
      >,
  ): Promise<FlowEntry> {
    return this.saveDated('flow', this.db.flowEntries, input)
  }

  async listFlow(): Promise<FlowEntry[]> {
    return this.db.flowEntries.orderBy('date').toArray()
  }

  async saveSymptom(
    input: Omit<
      SymptomEntry,
      'createdAt' | 'updatedAt' | 'revision' | 'sourceId' | 'schemaVersion'
    > &
      Partial<
        Pick<SymptomEntry, 'createdAt' | 'updatedAt' | 'revision' | 'sourceId'>
      >,
  ): Promise<SymptomEntry> {
    return this.saveDated('symptom', this.db.symptomEntries, input)
  }

  async listSymptoms(): Promise<SymptomEntry[]> {
    return this.db.symptomEntries.orderBy('date').toArray()
  }

  async saveMood(
    input: Omit<
      MoodEntry,
      'createdAt' | 'updatedAt' | 'revision' | 'sourceId' | 'schemaVersion'
    > &
      Partial<
        Pick<MoodEntry, 'createdAt' | 'updatedAt' | 'revision' | 'sourceId'>
      >,
  ): Promise<MoodEntry> {
    return this.saveDated('mood', this.db.moodEntries, input)
  }

  async listMood(): Promise<MoodEntry[]> {
    return this.db.moodEntries.orderBy('date').toArray()
  }

  async saveWeight(
    input: Omit<
      WeightEntry,
      'createdAt' | 'updatedAt' | 'revision' | 'sourceId' | 'schemaVersion'
    > &
      Partial<
        Pick<WeightEntry, 'createdAt' | 'updatedAt' | 'revision' | 'sourceId'>
      >,
  ): Promise<WeightEntry> {
    return this.saveDated('weight', this.db.weightEntries, input)
  }

  async listWeight(): Promise<WeightEntry[]> {
    return this.db.weightEntries.orderBy('date').toArray()
  }

  async saveNote(
    input: Omit<
      NoteEntry,
      'createdAt' | 'updatedAt' | 'revision' | 'sourceId' | 'schemaVersion'
    > &
      Partial<
        Pick<NoteEntry, 'createdAt' | 'updatedAt' | 'revision' | 'sourceId'>
      >,
  ): Promise<NoteEntry> {
    return this.saveDated('note', this.db.noteEntries, input)
  }

  async listNotes(): Promise<NoteEntry[]> {
    return this.db.noteEntries.orderBy('date').toArray()
  }

  async saveSexualActivity(
    input: Omit<
      SexualActivityEntry,
      'createdAt' | 'updatedAt' | 'revision' | 'sourceId' | 'schemaVersion'
    > &
      Partial<
        Pick<
          SexualActivityEntry,
          'createdAt' | 'updatedAt' | 'revision' | 'sourceId'
        >
      >,
  ): Promise<SexualActivityEntry> {
    return this.saveDated(
      'sexualActivity',
      this.db.sexualActivityEntries,
      input,
    )
  }

  async listSexualActivity(): Promise<SexualActivityEntry[]> {
    return this.db.sexualActivityEntries.orderBy('date').toArray()
  }

  async deleteRecord(entity: EntityName, id: string): Promise<void> {
    const table = this.tableFor(entity)
    const existing = await table.get(id)
    if (existing === undefined) return
    await table.delete(id)
    const tombstone: SyncRecord = {
      id: `tombstone:${entity}:${id}`,
      createdAt: existing.createdAt ?? iso(this.clock),
      updatedAt: iso(this.clock),
      revision: existing.revision + 1,
      sourceId: this.clock.sourceId,
      schemaVersion: SCHEMA_VERSION,
      recordType: entity,
      recordId: id,
      deleted: true,
      deletedAt: iso(this.clock),
    }
    await this.db.tombstones.put(tombstone)
    await this.queue.enqueue(bucketForRecord(entity, existing))
    await this.queue.enqueue(TOMBSTONE_BUCKET)
  }

  async applyBucket(
    entity: EntityName,
    records: readonly MergeableRecord[],
    replaceIds: ReadonlySet<string>,
  ): Promise<void> {
    const table = this.tableFor(entity)
    for (const id of replaceIds) {
      const incoming = records.find((record) => record.id === id)
      if (incoming === undefined) {
        await table.delete(id)
        continue
      }
      await table.put(parseRecord(entity, incoming))
    }
  }

  async applyTombstones(tombstones: readonly SyncRecord[]): Promise<void> {
    for (const tombstone of tombstones) {
      const parsed = syncRecordSchema.parse(tombstone)
      const table = this.tableFor(parsed.recordType)
      const live = await table.get(parsed.recordId)
      if (live !== undefined && compareRecords(parsed, live) > 0) {
        await table.delete(parsed.recordId)
      }
      const existingTomb = await this.db.tombstones.get(parsed.id)
      if (
        existingTomb === undefined ||
        compareRecords(parsed, existingTomb) >= 0
      ) {
        await this.db.tombstones.put(parsed)
      }
    }
  }

  async clearAll(): Promise<void> {
    await Promise.all([
      this.db.profiles.clear(),
      this.db.settings.clear(),
      this.db.cycles.clear(),
      this.db.flowEntries.clear(),
      this.db.symptomEntries.clear(),
      this.db.moodEntries.clear(),
      this.db.weightEntries.clear(),
      this.db.noteEntries.clear(),
      this.db.sexualActivityEntries.clear(),
      this.db.tombstones.clear(),
      this.db.kv.clear(),
      this.db.syncQueue.clear(),
    ])
  }

  private tableFor(entity: EntityName): Table<MergeableRecord, string> {
    switch (entity) {
      case 'profile':
        return this.db.profiles
      case 'settings':
        return this.db.settings
      case 'cycle':
        return this.db.cycles
      case 'flow':
        return this.db.flowEntries
      case 'symptom':
        return this.db.symptomEntries
      case 'mood':
        return this.db.moodEntries
      case 'weight':
        return this.db.weightEntries
      case 'note':
        return this.db.noteEntries
      case 'sexualActivity':
        return this.db.sexualActivityEntries
    }
  }

  private async saveDated<T extends MergeableRecord & { id: string }>(
    entity: EntityName,
    table: Table<T, string>,
    input: Omit<
      T,
      'createdAt' | 'updatedAt' | 'revision' | 'sourceId' | 'schemaVersion'
    > &
      Partial<Pick<T, 'createdAt' | 'updatedAt' | 'revision' | 'sourceId'>>,
  ): Promise<T> {
    const id = input.id
    const existing = await table.get(id)
    const record = withRevision(
      {
        createdAt: iso(this.clock),
        updatedAt: iso(this.clock),
        revision: 1,
        sourceId: this.clock.sourceId,
        schemaVersion: SCHEMA_VERSION,
        ...input,
      } as unknown as T,
      existing,
      this.clock,
    )
    await table.put(record)
    await this.queue.enqueue(bucketForRecord(entity, record))
    return record
  }
}
