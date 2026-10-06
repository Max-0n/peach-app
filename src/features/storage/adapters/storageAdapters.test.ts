import 'fake-indexeddb/auto'
import { afterEach, describe, expect, it } from 'vitest'
import { PeachDatabase } from '../db/PeachDatabase'
import { IndexedDbStorage } from './IndexedDbStorage'
import {
  StorageUnavailableError,
  TelegramCloudStorage,
  type TelegramKeyValueApi,
} from './TelegramStorage'

afterEach(async () => {
  await PeachDatabase.delete('storage-adapter-test')
})

describe('IndexedDbStorage', () => {
  it('implements get, set, remove, and clear', async () => {
    const db = new PeachDatabase('storage-adapter-test')
    const storage = new IndexedDbStorage(db)
    await storage.set('theme', { dark: true })
    expect(await storage.get('theme')).toEqual({ dark: true })
    await storage.remove('theme')
    expect(await storage.get('theme')).toBeNull()
    await storage.set('one', 1)
    await storage.clear()
    expect(await storage.get('one')).toBeNull()
    db.close()
  })
})

describe('TelegramCloudStorage', () => {
  it('JSON encodes and decodes through the typed callback API', async () => {
    const values = new Map<string, string>()
    const api: TelegramKeyValueApi = {
      setItem: (key, value, callback) => {
        values.set(key, value)
        callback?.(null, true)
      },
      getItem: (key, callback) => {
        callback(null, values.get(key))
      },
      removeItem: (key, callback) => {
        values.delete(key)
        callback?.(null, true)
      },
    }
    const storage = new TelegramCloudStorage(api)
    await storage.set('settings', { locale: 'de' })
    await expect(storage.get('settings')).resolves.toEqual({ locale: 'de' })
  })

  it('returns a friendly unavailable error without leaking raw errors', async () => {
    const storage = new TelegramCloudStorage(null)
    await expect(storage.get('key')).rejects.toMatchObject({
      name: 'StorageUnavailableError',
      status: 'unavailable',
    } satisfies Partial<StorageUnavailableError>)
  })
})
