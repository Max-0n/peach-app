import {
  SCHEMA_VERSION,
  type AppSettings,
  type UserProfile,
} from '../../../domain'
import type { RawAppStorage } from '../adapters/AppStorage'
import { StorageUnavailableError } from '../adapters/TelegramStorage'
import type { PeachDatabase } from '../db/PeachDatabase'
import type { RecordRepository } from '../repositories/recordRepository'
import {
  loadLocalBucket,
  parseBucket,
  TOMBSTONE_BUCKET,
  type BucketPayload,
} from './buckets'
import {
  CloudQuotaError,
  CorruptCloudDataError,
  createChunkedBucket,
  decodeChunkedBucket,
  ensureCloudKeyQuota,
  type BucketDescriptor,
} from './chunkCodec'
import { compareRecords, mergeRecords, type MergeableRecord } from './merge'
import type { SyncQueue } from './queue'
import type { SyncRecord } from '../../../domain'

export const MANIFEST_KEY = 'peach_manifest'
export const DEVICE_SETTINGS_KEY = 'peach_settings'
export const DEVICE_PROFILE_KEY = 'peach_profile'

export type SyncState = 'synced' | 'pending' | 'local-only'

export interface CloudManifest {
  schemaVersion: number
  revision: number
  updatedAt: string
  sourceId: string
  buckets: Record<string, BucketDescriptor>
}

export interface SyncResult {
  state: SyncState
}

function emptyManifest(sourceId: string, updatedAt: string): CloudManifest {
  return {
    schemaVersion: SCHEMA_VERSION,
    revision: 0,
    updatedAt,
    sourceId,
    buckets: {},
  }
}

function liveRecords(
  records: readonly MergeableRecord[],
  tombstones: readonly SyncRecord[],
): MergeableRecord[] {
  const winners = new Map<string, SyncRecord>()
  for (const tombstone of tombstones) {
    const current = winners.get(tombstone.recordId)
    if (current === undefined || compareRecords(tombstone, current) > 0) {
      winners.set(tombstone.recordId, tombstone)
    }
  }
  return records.filter((record) => {
    const tombstone = winners.get(record.id)
    return tombstone === undefined || compareRecords(record, tombstone) > 0
  })
}

export class SyncEngine {
  private running: Promise<SyncResult> | null = null
  private readonly db: PeachDatabase
  private readonly repository: RecordRepository
  private readonly queue: SyncQueue
  private readonly cloud: RawAppStorage | null
  private readonly device: RawAppStorage | null
  private readonly sourceId: string
  private readonly now: () => Date

  constructor(
    db: PeachDatabase,
    repository: RecordRepository,
    queue: SyncQueue,
    cloud: RawAppStorage | null,
    device: RawAppStorage | null,
    sourceId: string,
    now: () => Date = () => new Date(),
  ) {
    this.db = db
    this.repository = repository
    this.queue = queue
    this.cloud = cloud
    this.device = device
    this.sourceId = sourceId
    this.now = now
  }

  async syncNow(): Promise<SyncResult> {
    if (this.running) return this.running
    this.running = this.performSync().finally(() => {
      this.running = null
    })
    return this.running
  }

  private async performSync(): Promise<SyncResult> {
    if (this.cloud === null) return { state: 'local-only' }
    try {
      await this.restoreFromDeviceIfEmpty()
      const queued = await this.queue.dueItems()
      const manifest = await this.pullManifest(this.cloud)
      const buckets = new Set<string>([
        ...queued.map((item) => item.bucket),
        ...Object.keys(manifest.buckets),
        TOMBSTONE_BUCKET,
      ])
      for (const bucket of buckets) {
        await this.syncBucket(bucket)
      }
      return { state: 'synced' }
    } catch (error: unknown) {
      if (import.meta.env.DEV) {
        console.error('Sync deferred', error)
      }
      return { state: 'pending' }
    }
  }

  private async restoreFromDeviceIfEmpty(): Promise<void> {
    if (this.device === null) return
    const profile = await this.repository.getProfile()
    const settings = await this.repository.getSettings()
    if (profile === undefined) {
      const mirrored = await this.device.get<UserProfile>(DEVICE_PROFILE_KEY)
      if (mirrored !== null) await this.db.profiles.put(mirrored)
    }
    if (settings === undefined) {
      const mirrored = await this.device.get<AppSettings>(DEVICE_SETTINGS_KEY)
      if (mirrored !== null) await this.db.settings.put(mirrored)
    }
  }

  private async pullManifest(cloud: RawAppStorage): Promise<CloudManifest> {
    try {
      const manifest = await cloud.get<CloudManifest>(MANIFEST_KEY)
      if (manifest?.schemaVersion !== SCHEMA_VERSION) {
        return emptyManifest(this.sourceId, this.now().toISOString())
      }
      return manifest
    } catch (error: unknown) {
      if (error instanceof StorageUnavailableError) throw error
      return emptyManifest(this.sourceId, this.now().toISOString())
    }
  }

  private async readCloudPayload(
    cloud: RawAppStorage,
    descriptor: BucketDescriptor | undefined,
  ): Promise<BucketPayload> {
    if (descriptor === undefined) return { records: [], tombstones: [] }
    const chunks = await cloud.getManyRaw(descriptor.chunkKeys)
    try {
      return await decodeChunkedBucket<BucketPayload>(descriptor, chunks)
    } catch (error: unknown) {
      if (error instanceof CorruptCloudDataError) {
        return { records: [], tombstones: [] }
      }
      throw error
    }
  }

  private async syncBucket(bucket: string): Promise<void> {
    const cloud = this.cloud
    if (cloud === null) return
    try {
      parseBucket(bucket)
    } catch {
      return
    }

    let manifest = await this.pullManifest(cloud)
    let local = await loadLocalBucket(this.db, bucket)
    let remote = await this.readCloudPayload(cloud, manifest.buckets[bucket])
    let merged = this.mergePayloads(local, remote)

    const latestManifest = await this.pullManifest(cloud)
    if (
      latestManifest.buckets[bucket]?.hash !== manifest.buckets[bucket]?.hash
    ) {
      remote = await this.readCloudPayload(
        cloud,
        latestManifest.buckets[bucket],
      )
      local = await loadLocalBucket(this.db, bucket)
      merged = this.mergePayloads(local, remote)
    }
    manifest = latestManifest

    await this.applyMerged(bucket, merged)

    const revision =
      Math.max(
        manifest.buckets[bucket]?.revision ?? 0,
        0,
        ...merged.records.map((record) => record.revision),
        ...merged.tombstones.map((tombstone) => tombstone.revision),
      ) + 1
    const encoded = await createChunkedBucket(
      bucket,
      revision,
      merged,
      this.now().toISOString(),
    )
    const staleKeys = manifest.buckets[bucket]?.chunkKeys ?? []
    const existingKeys = await cloud.keys()
    const retained = existingKeys.filter((key) => !staleKeys.includes(key))
    const extraManifestKey = retained.includes(MANIFEST_KEY) ? 0 : 1
    ensureCloudKeyQuota(
      retained.length,
      encoded.descriptor.chunkKeys.length + extraManifestKey,
    )

    for (const [key, value] of Object.entries(encoded.chunks)) {
      await cloud.setRaw(key, value)
    }

    const nextManifest: CloudManifest = {
      schemaVersion: SCHEMA_VERSION,
      revision: manifest.revision + 1,
      updatedAt: this.now().toISOString(),
      sourceId: this.sourceId,
      buckets: {
        ...manifest.buckets,
        [bucket]: encoded.descriptor,
      },
    }
    await cloud.set(MANIFEST_KEY, nextManifest)
    await cloud.removeMany(
      staleKeys.filter((key) => !encoded.descriptor.chunkKeys.includes(key)),
    )
    await this.mirrorDevice()
    await this.queue.clearBucket(bucket)
  }

  private mergePayloads(
    local: BucketPayload,
    remote: BucketPayload,
  ): BucketPayload {
    const tombstones = mergeRecords(local.tombstones, remote.tombstones)
    return {
      records: liveRecords(
        mergeRecords(local.records, remote.records),
        tombstones,
      ),
      tombstones,
    }
  }

  private async applyMerged(
    bucket: string,
    payload: BucketPayload,
  ): Promise<void> {
    const parsed = parseBucket(bucket)
    if (parsed.entity === 'tombstones') {
      await this.repository.applyTombstones(payload.tombstones)
      return
    }
    const ids = new Set(payload.records.map((record) => record.id))
    await this.repository.applyBucket(parsed.entity, payload.records, ids)
    await this.repository.applyTombstones(payload.tombstones)
  }

  private async mirrorDevice(): Promise<void> {
    if (this.device === null) return
    const profile = await this.repository.getProfile()
    const settings = await this.repository.getSettings()
    if (profile) await this.device.set(DEVICE_PROFILE_KEY, profile)
    if (settings) await this.device.set(DEVICE_SETTINGS_KEY, settings)
    const manifest = this.cloud
      ? await this.cloud.get<CloudManifest>(MANIFEST_KEY)
      : null
    if (manifest) await this.device.set(MANIFEST_KEY, manifest)
  }
}

export { CloudQuotaError }
