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

export interface AppRecords {
  cycles: Cycle[]
  flow: FlowEntry[]
  symptoms: SymptomEntry[]
  mood: MoodEntry[]
  weight: WeightEntry[]
  notes: NoteEntry[]
  sexualActivity: SexualActivityEntry[]
}

export const emptyRecords: AppRecords = {
  cycles: [],
  flow: [],
  symptoms: [],
  mood: [],
  weight: [],
  notes: [],
  sexualActivity: [],
}

export interface DataSnapshot {
  profile: UserProfile | undefined
  settings: AppSettings | undefined
  records: AppRecords
}
