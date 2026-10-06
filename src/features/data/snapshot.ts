import type { RecordRepository } from '../storage/repositories/recordRepository'
import { emptyRecords, type DataSnapshot } from './types'

export async function loadSnapshot(
  repository: RecordRepository,
): Promise<DataSnapshot> {
  const [
    profile,
    settings,
    cycles,
    flow,
    symptoms,
    mood,
    weight,
    notes,
    sexualActivity,
  ] = await Promise.all([
    repository.getProfile(),
    repository.getSettings(),
    repository.listCycles(),
    repository.listFlow(),
    repository.listSymptoms(),
    repository.listMood(),
    repository.listWeight(),
    repository.listNotes(),
    repository.listSexualActivity(),
  ])
  return {
    profile,
    settings,
    records: {
      cycles,
      flow,
      symptoms,
      mood,
      weight,
      notes,
      sexualActivity,
    },
  }
}

export function upsertById<T extends { id: string }>(
  items: readonly T[],
  item: T,
): T[] {
  const exists = items.some((current) => current.id === item.id)
  if (!exists) {
    return [...items, item]
  }
  return items.map((current) => (current.id === item.id ? item : current))
}

export { emptyRecords }
