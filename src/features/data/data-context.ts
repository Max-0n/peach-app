import { createContext, useContext } from 'react'
import type {
  AppSettings,
  Cycle,
  FlowEntry,
  MoodEntry,
  NoteEntry,
  SexualActivityEntry,
  SymptomEntry,
  UserProfile,
  WeightEntry,
} from '../../domain'
import type { SyncState } from '../storage'
import type { RecordRepository } from '../storage/repositories/recordRepository'
import type { AppRecords } from './types'

export type DayRecordEntity =
  | 'cycle'
  | 'flow'
  | 'symptom'
  | 'mood'
  | 'weight'
  | 'note'
  | 'sexualActivity'

export interface DataContextValue {
  hydrated: boolean
  profile: UserProfile | undefined
  settings: AppSettings | undefined
  records: AppRecords
  syncState: SyncState
  saveProfile: (
    input?: Parameters<RecordRepository['saveProfile']>[0],
  ) => Promise<UserProfile>
  saveSettings: (
    input?: Parameters<RecordRepository['saveSettings']>[0],
  ) => Promise<AppSettings>
  saveCycle: (
    input: Parameters<RecordRepository['saveCycle']>[0],
  ) => Promise<Cycle>
  saveFlow: (
    input: Parameters<RecordRepository['saveFlow']>[0],
  ) => Promise<FlowEntry>
  saveSymptom: (
    input: Parameters<RecordRepository['saveSymptom']>[0],
  ) => Promise<SymptomEntry>
  saveMood: (
    input: Parameters<RecordRepository['saveMood']>[0],
  ) => Promise<MoodEntry>
  saveWeight: (
    input: Parameters<RecordRepository['saveWeight']>[0],
  ) => Promise<WeightEntry>
  saveNote: (
    input: Parameters<RecordRepository['saveNote']>[0],
  ) => Promise<NoteEntry>
  saveSexualActivity: (
    input: Parameters<RecordRepository['saveSexualActivity']>[0],
  ) => Promise<SexualActivityEntry>
  deleteRecord: (entity: DayRecordEntity, id: string) => Promise<void>
  deleteAllLocalData: () => Promise<void>
}

export const DataContext = createContext<DataContextValue | null>(null)

export function useData(): DataContextValue {
  const value = useContext(DataContext)
  if (value === null) {
    throw new Error('useData must be used within DataProvider')
  }
  return value
}
