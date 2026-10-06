import type { RawAppStorage } from './adapters/AppStorage'
import { PeachDatabase } from './db/PeachDatabase'
import { RecordRepository } from './repositories/recordRepository'
import { SyncEngine } from './sync/engine'
import { SyncQueue } from './sync/queue'

export { IndexedDbStorage } from './adapters/IndexedDbStorage'
export {
  StorageUnavailableError,
  TelegramCloudStorage,
  TelegramDeviceStorage,
} from './adapters/TelegramStorage'
export type { AppStorage, RawAppStorage } from './adapters/AppStorage'
export { PeachDatabase } from './db/PeachDatabase'
export { RecordRepository } from './repositories/recordRepository'
export {
  MANIFEST_KEY,
  SyncEngine,
  type SyncResult,
  type SyncState,
} from './sync/engine'
export { SyncQueue } from './sync/queue'
export { mergeRecords, bucketForDate, bucketsForRange } from './sync/merge'
export {
  createChunkedBucket,
  decodeChunkedBucket,
  CloudQuotaError,
  CorruptCloudDataError,
} from './sync/chunkCodec'

export interface DataLayerOptions {
  dbName?: string
  cloud?: RawAppStorage | null
  device?: RawAppStorage | null
  sourceId: string
  now?: () => Date
}

export function createDataLayer(options: DataLayerOptions) {
  const db = new PeachDatabase(options.dbName)
  const now = options.now ?? (() => new Date())
  const queue = new SyncQueue(db, now)
  const repository = new RecordRepository(
    db,
    { now, sourceId: options.sourceId },
    queue,
  )
  const engine = new SyncEngine(
    db,
    repository,
    queue,
    options.cloud ?? null,
    options.device ?? null,
    options.sourceId,
    now,
  )
  return { db, queue, repository, engine }
}
