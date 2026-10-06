import Dexie, { type Table } from 'dexie'
import type {
  AppSettings,
  Cycle,
  FlowEntry,
  MoodEntry,
  NoteEntry,
  SexualActivityEntry,
  SymptomEntry,
  SyncRecord,
  UserProfile,
  WeightEntry,
} from '../../../domain'

export interface KvRow {
  key: string
  value: string
}

export interface SyncQueueItem {
  id: string
  bucket: string
  createdAt: string
  attempts: number
  nextAttemptAt: string
}

export class PeachDatabase extends Dexie {
  kv!: Table<KvRow, string>
  profiles!: Table<UserProfile, string>
  settings!: Table<AppSettings, string>
  cycles!: Table<Cycle, string>
  flowEntries!: Table<FlowEntry, string>
  symptomEntries!: Table<SymptomEntry, string>
  moodEntries!: Table<MoodEntry, string>
  weightEntries!: Table<WeightEntry, string>
  noteEntries!: Table<NoteEntry, string>
  sexualActivityEntries!: Table<SexualActivityEntry, string>
  tombstones!: Table<SyncRecord, string>
  syncQueue!: Table<SyncQueueItem, string>

  constructor(name = 'peach') {
    super(name)
    this.version(1).stores({
      kv: 'key',
      profiles: 'id',
      settings: 'id',
      cycles: 'id, startDate, updatedAt',
      flowEntries: 'id, date, updatedAt',
      symptomEntries: 'id, date, symptom, updatedAt',
      moodEntries: 'id, date, updatedAt',
      weightEntries: 'id, date, updatedAt',
      noteEntries: 'id, date, updatedAt',
      sexualActivityEntries: 'id, date, updatedAt',
      tombstones: 'id, recordType, recordId, updatedAt',
      syncQueue: 'id, bucket, nextAttemptAt',
    })
  }
}
