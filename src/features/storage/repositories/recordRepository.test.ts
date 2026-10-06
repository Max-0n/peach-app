import 'fake-indexeddb/auto'
import { Dexie } from 'dexie'
import { afterEach, describe, expect, it } from 'vitest'
import { SCHEMA_VERSION } from '../../../domain'
import { createLocalDate } from '../../../domain/cycle/types'
import { PeachDatabase } from '../db/PeachDatabase'
import { RecordRepository } from './recordRepository'
import { SyncQueue } from '../sync/queue'

afterEach(async () => {
  await Dexie.delete('record-repository-test')
})

function layer() {
  const db = new PeachDatabase('record-repository-test')
  const queue = new SyncQueue(db, () => new Date('2026-10-06T12:00:00.000Z'))
  const repository = new RecordRepository(
    db,
    {
      sourceId: 'device-a',
      now: () => new Date('2026-10-06T12:00:00.000Z'),
    },
    queue,
  )
  return { db, queue, repository }
}

describe('RecordRepository', () => {
  it('saves locally and enqueues the matching month bucket', async () => {
    const { repository, queue, db } = layer()
    const cycle = await repository.saveCycle({
      id: 'cycle-1',
      startDate: createLocalDate('2025-12-31'),
      endDate: createLocalDate('2026-01-04'),
    })
    expect(cycle.schemaVersion).toBe(SCHEMA_VERSION)
    expect(cycle.revision).toBe(1)
    expect(await repository.listCycles()).toEqual([cycle])
    expect((await queue.dueItems()).map((item) => item.bucket)).toEqual([
      'cycle_2025_12',
    ])
    db.close()
  })

  it('bumps revision on duplicate ids instead of storing two live rows', async () => {
    const { repository, db } = layer()
    await repository.saveFlow({
      id: 'flow-1',
      date: createLocalDate('2026-01-01'),
      flow: 'light',
    })
    const updated = await repository.saveFlow({
      id: 'flow-1',
      date: createLocalDate('2026-01-01'),
      flow: 'heavy',
    })
    expect(updated.revision).toBe(2)
    expect(updated.flow).toBe('heavy')
    expect(await repository.listFlow()).toHaveLength(1)
    db.close()
  })

  it('keeps December and January entries in separate buckets', async () => {
    const { repository, queue, db } = layer()
    await repository.saveNote({
      id: 'note-dec',
      date: createLocalDate('2026-12-31'),
      text: 'year end',
    })
    await repository.saveNote({
      id: 'note-jan',
      date: createLocalDate('2027-01-01'),
      text: 'year start',
    })
    expect((await queue.dueItems()).map((item) => item.bucket).sort()).toEqual([
      'note_2026_12',
      'note_2027_01',
    ])
    db.close()
  })

  it('replaces a live record with a tombstone on delete', async () => {
    const { repository, db } = layer()
    await repository.saveWeight({
      id: 'weight-1',
      date: createLocalDate('2026-03-01'),
      weightKg: 70,
    })
    await repository.deleteRecord('weight', 'weight-1')
    expect(await repository.listWeight()).toEqual([])
    const tombstone = await db.tombstones.toArray()
    expect(tombstone).toHaveLength(1)
    expect(tombstone[0]?.deleted).toBe(true)
    expect(tombstone[0]?.recordId).toBe('weight-1')
    db.close()
  })
})
