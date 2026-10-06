import { describe, expect, it } from 'vitest'
import {
  CloudQuotaError,
  CorruptCloudDataError,
  createChunkedBucket,
  decodeChunkedBucket,
  ensureCloudKeyQuota,
} from './chunkCodec'

describe('chunk codec', () => {
  it('keeps chunks within 3900 UTF-16 units without splitting surrogate pairs', async () => {
    const value = { text: '🍑'.repeat(4_000) }
    const encoded = await createChunkedBucket('note_2026_10', 4, value)

    expect(encoded.descriptor.chunkKeys.every((key) => key.length <= 128)).toBe(
      true,
    )
    expect(
      Object.values(encoded.chunks).every(
        (chunk) =>
          chunk.length <= 3_900 &&
          !/[\uD800-\uDBFF]$/u.test(chunk) &&
          !/^[\uDC00-\uDFFF]/u.test(chunk),
      ),
    ).toBe(true)
    await expect(
      decodeChunkedBucket(encoded.descriptor, encoded.chunks),
    ).resolves.toEqual(value)
  })

  it('rejects missing and corrupt chunks', async () => {
    const encoded = await createChunkedBucket('profile', 1, { name: 'Peach' })
    const [key] = encoded.descriptor.chunkKeys
    if (key === undefined) throw new Error('Expected a chunk')

    await expect(
      decodeChunkedBucket(encoded.descriptor, {}),
    ).rejects.toBeInstanceOf(CorruptCloudDataError)
    await expect(
      decodeChunkedBucket(encoded.descriptor, { [key]: 'corrupt' }),
    ).rejects.toBeInstanceOf(CorruptCloudDataError)
  })

  it('reports quota before exceeding Telegram 1024 keys', () => {
    expect(() => {
      ensureCloudKeyQuota(1_020, 5)
    }).toThrow(CloudQuotaError)
    expect(() => {
      ensureCloudKeyQuota(1_020, 4)
    }).not.toThrow()
  })
})
