import 'fake-indexeddb/auto'
import { afterEach, describe, expect, it } from 'vitest'
import { Dexie } from 'dexie'
import { PeachDatabase } from '../db/PeachDatabase'
import { nextAttemptAt, SyncQueue } from './queue'

afterEach(async () => {
  await Dexie.delete('sync-queue-test')
})

describe('SyncQueue', () => {
  it('coalesces duplicate bucket entries and keeps them durable', async () => {
    const db = new PeachDatabase('sync-queue-test')
    const queue = new SyncQueue(db, () => new Date('2026-10-06T00:00:00.000Z'))
    await queue.enqueue('flow_2026_10')
    await queue.enqueue('flow_2026_10')
    expect(await db.syncQueue.count()).toBe(1)
    db.close()
  })

  it('backs off after a failed attempt', async () => {
    const db = new PeachDatabase('sync-queue-test')
    let now = new Date('2026-10-06T00:00:00.000Z')
    const queue = new SyncQueue(db, () => now)
    await queue.enqueue('profile')
    const [item] = await queue.dueItems()
    if (item === undefined) throw new Error('Expected queue item')
    await queue.markAttempt(item.id, true)
    now = new Date('2026-10-06T00:00:00.500Z')
    expect(await queue.dueItems()).toEqual([])
    now = new Date(nextAttemptAt(1, new Date('2026-10-06T00:00:00.000Z')))
    expect(await queue.dueItems()).toHaveLength(1)
    db.close()
  })
})
