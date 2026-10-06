import { describe, expect, it } from 'vitest'
import { bucketForDate, bucketsForRange, mergeRecords } from './merge'

interface RecordFixture {
  readonly id: string
  readonly revision: number
  readonly updatedAt: string
  readonly sourceId: string
  readonly value?: string
  readonly deleted?: boolean
}

const record = (overrides: Partial<RecordFixture> = {}): RecordFixture => ({
  id: 'same',
  revision: 1,
  updatedAt: '2026-10-01T00:00:00.000Z',
  sourceId: 'device-a',
  value: 'local',
  ...overrides,
})

describe('deterministic record merge', () => {
  it('collapses duplicates and uses revision, updatedAt, then sourceId', () => {
    const older = record()
    const newer = record({ revision: 2, value: 'newer' })
    const latestTime = record({
      revision: 2,
      updatedAt: '2026-10-02T00:00:00.000Z',
      value: 'latest',
    })
    const sourceWinner = record({
      revision: 2,
      updatedAt: '2026-10-02T00:00:00.000Z',
      sourceId: 'device-z',
      value: 'source winner',
    })

    expect(mergeRecords([older, newer], [latestTime, sourceWinner])).toEqual([
      sourceWinner,
    ])
  })

  it('uses deterministic content fallback for an exact metadata tie', () => {
    const a = record({ value: 'a' })
    const b = record({ value: 'b' })
    expect(mergeRecords([a], [b])).toEqual(mergeRecords([b], [a]))
  })

  it('preserves a tombstone over an older live record', () => {
    const live = record({ revision: 4 })
    const tombstone = record({ revision: 5, deleted: true })
    expect(mergeRecords([live], [tombstone])).toEqual([tombstone])
  })

  it('returns stable id-sorted output', () => {
    expect(
      mergeRecords(
        [record({ id: 'z' })],
        [record({ id: 'a', sourceId: 'device-b' })],
      ).map(({ id }) => id),
    ).toEqual(['a', 'z'])
  })
})

describe('calendar buckets', () => {
  it('creates month and inclusive range bucket names across years', () => {
    expect(bucketForDate('flow', '2026-01-03')).toBe('flow_2026_01')
    expect(bucketsForRange('note', '2025-12-31', '2026-02-01')).toEqual([
      'note_2025_12',
      'note_2026_01',
      'note_2026_02',
    ])
  })
})
