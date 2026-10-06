import { randomUUID } from '../../../lib/randomId'
import type { PeachDatabase, SyncQueueItem } from '../db/PeachDatabase'

const BACKOFF_MS = [1_000, 5_000, 25_000, 125_000] as const

export function nextAttemptAt(
  attempts: number,
  now: Date = new Date(),
): string {
  const delay = BACKOFF_MS[Math.min(attempts, BACKOFF_MS.length - 1)] ?? 1_000
  return new Date(now.getTime() + delay).toISOString()
}

export class SyncQueue {
  private readonly db: PeachDatabase
  private readonly now: () => Date

  constructor(db: PeachDatabase, now: () => Date = () => new Date()) {
    this.db = db
    this.now = now
  }

  async enqueue(bucket: string): Promise<void> {
    const existing = await this.db.syncQueue
      .where('bucket')
      .equals(bucket)
      .first()
    if (existing !== undefined) {
      await this.db.syncQueue.put({
        ...existing,
        nextAttemptAt: this.now().toISOString(),
      })
      return
    }
    const item: SyncQueueItem = {
      id: randomUUID(),
      bucket,
      createdAt: this.now().toISOString(),
      attempts: 0,
      nextAttemptAt: this.now().toISOString(),
    }
    await this.db.syncQueue.put(item)
  }

  async dueItems(): Promise<SyncQueueItem[]> {
    return this.db.syncQueue
      .where('nextAttemptAt')
      .belowOrEqual(this.now().toISOString())
      .toArray()
  }

  async markAttempt(id: string, failed: boolean): Promise<void> {
    const item = await this.db.syncQueue.get(id)
    if (item === undefined) return
    if (!failed) {
      await this.db.syncQueue.delete(id)
      return
    }
    const attempts = item.attempts + 1
    await this.db.syncQueue.put({
      ...item,
      attempts,
      nextAttemptAt: nextAttemptAt(attempts, this.now()),
    })
  }

  async clearBucket(bucket: string): Promise<void> {
    await this.db.syncQueue.where('bucket').equals(bucket).delete()
  }

  async clear(): Promise<void> {
    await this.db.syncQueue.clear()
  }
}
