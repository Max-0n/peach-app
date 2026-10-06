import { afterEach, describe, expect, it, vi } from 'vitest'
import { randomUUID } from './randomId'

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu

describe('randomUUID', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('uses randomUUID when available', () => {
    const randomUUIDFn = vi.fn(() => '11111111-1111-4111-8111-111111111111')
    vi.stubGlobal('crypto', { randomUUID: randomUUIDFn })
    expect(randomUUID()).toBe('11111111-1111-4111-8111-111111111111')
    expect(randomUUIDFn).toHaveBeenCalledOnce()
  })

  it('falls back to getRandomValues without randomUUID', () => {
    vi.stubGlobal('crypto', {
      getRandomValues: (bytes: Uint8Array) => {
        bytes.fill(0)
        return bytes
      },
    })
    expect(randomUUID()).toMatch(UUID_RE)
  })
})
