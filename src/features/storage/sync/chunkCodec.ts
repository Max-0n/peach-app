export const MAX_CHUNK_LENGTH = 3_900
export const MAX_CLOUD_KEYS = 1_024

export interface BucketDescriptor {
  readonly bucket: string
  readonly chunkKeys: readonly string[]
  readonly hash: string
  readonly revision: number
  readonly updatedAt: string
}

export interface ChunkedBucket {
  readonly descriptor: BucketDescriptor
  readonly chunks: Readonly<Record<string, string>>
}

export class CorruptCloudDataError extends Error {
  constructor(message = 'Cloud data is incomplete or damaged.') {
    super(message)
    this.name = 'CorruptCloudDataError'
  }
}

export class CloudQuotaError extends Error {
  constructor() {
    super('Cloud storage is full. Your local data is still safe.')
    this.name = 'CloudQuotaError'
  }
}

function safeBucketName(bucket: string): string {
  const safe = bucket.replace(/[^A-Za-z0-9_-]/gu, '_')
  return safe.slice(0, 80)
}

function splitUtf16(value: string): string[] {
  const chunks: string[] = []
  let start = 0
  while (start < value.length) {
    let end = Math.min(start + MAX_CHUNK_LENGTH, value.length)
    if (
      end < value.length &&
      end > start &&
      /[\uD800-\uDBFF]/u.test(value[end - 1] ?? '')
    ) {
      end -= 1
    }
    chunks.push(value.slice(start, end))
    start = end
  }
  return chunks.length === 0 ? [''] : chunks
}

async function sha256(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('')
}

export async function createChunkedBucket(
  bucket: string,
  revision: number,
  value: unknown,
  updatedAt = new Date().toISOString(),
): Promise<ChunkedBucket> {
  const envelope = JSON.stringify({ schemaVersion: 1, value })
  const parts = splitUtf16(envelope)
  const prefix = `peach_${safeBucketName(bucket)}_r${String(revision)}`
  const chunkKeys = parts.map(
    (_, index) =>
      `${prefix}_${index.toString().padStart(parts.length.toString().length, '0')}`,
  )
  const chunks = Object.fromEntries(
    chunkKeys.map((key, index) => [key, parts[index] ?? '']),
  )
  return {
    descriptor: {
      bucket,
      chunkKeys,
      hash: await sha256(envelope),
      revision,
      updatedAt,
    },
    chunks,
  }
}

export async function decodeChunkedBucket<T>(
  descriptor: BucketDescriptor,
  chunks: Readonly<Record<string, string | null | undefined>>,
): Promise<T> {
  const values = descriptor.chunkKeys.map((key) => chunks[key])
  if (values.some((value) => value == null)) {
    throw new CorruptCloudDataError()
  }
  const serialized = values.join('')
  if ((await sha256(serialized)) !== descriptor.hash) {
    throw new CorruptCloudDataError()
  }
  try {
    const parsed: unknown = JSON.parse(serialized)
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      !('schemaVersion' in parsed) ||
      parsed.schemaVersion !== 1 ||
      !('value' in parsed)
    ) {
      throw new CorruptCloudDataError()
    }
    return parsed.value as T
  } catch (error: unknown) {
    if (error instanceof CorruptCloudDataError) throw error
    throw new CorruptCloudDataError()
  }
}

export function ensureCloudKeyQuota(
  existingKeys: number,
  additionalKeys: number,
): void {
  if (existingKeys + additionalKeys > MAX_CLOUD_KEYS) {
    throw new CloudQuotaError()
  }
}
