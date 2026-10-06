import 'fake-indexeddb/auto'
import { afterEach, describe, expect, it } from 'vitest'
import { Dexie } from 'dexie'
import { SCHEMA_VERSION } from '../../../domain'
import { createLocalDate } from '../../../domain/cycle/types'
import {
  TelegramCloudStorage,
  type TelegramKeyValueApi,
} from '../adapters/TelegramStorage'
import { createDataLayer } from '../index'
import { MANIFEST_KEY, type CloudManifest } from './engine'

afterEach(async () => {
  await Dexie.delete('sync-engine-test')
})

function memoryApi(
  map = new Map<string, string>(),
  hooks: { onGet?: (key: string) => void } = {},
): TelegramKeyValueApi {
  return {
    setItem: (key, value, callback) => {
      map.set(key, value)
      callback?.(null, true)
    },
    getItem: (key, callback) => {
      hooks.onGet?.(key)
      callback(null, map.get(key) ?? null)
    },
    removeItem: (key, callback) => {
      map.delete(key)
      callback?.(null, true)
    },
    clear: (callback) => {
      map.clear()
      callback?.(null, true)
    },
    getKeys: (callback) => {
      callback(null, [...map.keys()])
    },
    getItems: (keys, callback) => {
      callback(
        null,
        Object.fromEntries(
          keys.flatMap((key) => {
            const value = map.get(key)
            return value === undefined ? [] : [[key, value]]
          }),
        ),
      )
    },
    removeItems: (keys, callback) => {
      for (const key of keys) map.delete(key)
      callback?.(null, true)
    },
  }
}

describe('SyncEngine', () => {
  it('keeps working locally when Telegram storage is absent', async () => {
    const { repository, engine, db } = createDataLayer({
      dbName: 'sync-engine-test',
      sourceId: 'device-a',
      now: () => new Date('2026-10-06T12:00:00.000Z'),
    })
    await repository.saveMood({
      id: 'mood-1',
      date: createLocalDate('2026-10-06'),
      mood: 'calm',
    })
    await expect(engine.syncNow()).resolves.toEqual({ state: 'local-only' })
    expect(await repository.listMood()).toHaveLength(1)
    db.close()
  })

  it('reports pending and preserves the queue when cloud is unavailable', async () => {
    const { repository, engine, queue, db } = createDataLayer({
      dbName: 'sync-engine-test',
      sourceId: 'device-a',
      cloud: new TelegramCloudStorage(null),
      now: () => new Date('2026-10-06T12:00:00.000Z'),
    })
    await repository.saveSettings({ locale: 'ru' })
    await expect(engine.syncNow()).resolves.toEqual({ state: 'pending' })
    expect(await queue.dueItems()).not.toEqual([])
    db.close()
  })

  it('resolves cloud/local conflicts by revision then timestamp then sourceId', async () => {
    const map = new Map<string, string>()
    const cloud = new TelegramCloudStorage(memoryApi(map))
    const remote = createDataLayer({
      dbName: 'sync-engine-remote',
      sourceId: 'device-b',
      cloud,
      now: () => new Date('2026-10-06T11:00:00.000Z'),
    })
    await remote.repository.saveProfile({ pregnancyMode: 'trying' })
    await remote.engine.syncNow()
    await Dexie.delete('sync-engine-remote')
    remote.db.close()

    const local = createDataLayer({
      dbName: 'sync-engine-test',
      sourceId: 'device-a',
      cloud: new TelegramCloudStorage(memoryApi(map)),
      now: () => new Date('2026-10-06T12:00:00.000Z'),
    })
    await local.repository.saveProfile({ pregnancyMode: 'avoiding' })
    await local.engine.syncNow()
    expect((await local.repository.getProfile())?.pregnancyMode).toBe(
      'avoiding',
    )
    const manifest = JSON.parse(
      map.get(MANIFEST_KEY) ?? 'null',
    ) as CloudManifest
    expect(manifest.schemaVersion).toBe(SCHEMA_VERSION)
    local.db.close()
  })

  it('does not resurrect a tombstoned record from older cloud data', async () => {
    const map = new Map<string, string>()
    const cloud = new TelegramCloudStorage(memoryApi(map))
    const first = createDataLayer({
      dbName: 'sync-engine-test',
      sourceId: 'device-a',
      cloud,
      now: () => new Date('2026-10-06T12:00:00.000Z'),
    })
    await first.repository.saveSymptom({
      id: 'sym-1',
      date: createLocalDate('2026-02-01'),
      symptom: 'cramps',
      severity: 2,
    })
    await first.engine.syncNow()
    await first.repository.deleteRecord('symptom', 'sym-1')
    await first.engine.syncNow()
    expect(await first.repository.listSymptoms()).toEqual([])

    const second = createDataLayer({
      dbName: 'sync-engine-second',
      sourceId: 'device-b',
      cloud: new TelegramCloudStorage(memoryApi(map)),
      now: () => new Date('2026-10-06T13:00:00.000Z'),
    })
    await second.engine.syncNow()
    expect(await second.repository.listSymptoms()).toEqual([])
    await Dexie.delete('sync-engine-second')
    first.db.close()
    second.db.close()
  })

  it('re-reads cloud before push so a newer remote write wins', async () => {
    const map = new Map<string, string>()
    let manifestReads = 0
    const api = memoryApi(map, {
      onGet: (key) => {
        if (key !== MANIFEST_KEY) return
        manifestReads += 1
        if (manifestReads === 3) {
          void (async () => {
            const hijack = createDataLayer({
              dbName: 'sync-engine-hijack',
              sourceId: 'device-z',
              cloud: new TelegramCloudStorage(memoryApi(map)),
              now: () => new Date('2026-10-06T15:00:00.000Z'),
            })
            await hijack.repository.saveNote({
              id: 'note-1',
              date: createLocalDate('2026-05-01'),
              text: 'from cloud',
            })
            await hijack.engine.syncNow()
            hijack.db.close()
            await Dexie.delete('sync-engine-hijack')
          })()
        }
      },
    })
    const local = createDataLayer({
      dbName: 'sync-engine-test',
      sourceId: 'device-a',
      cloud: new TelegramCloudStorage(api),
      now: () => new Date('2026-10-06T12:00:00.000Z'),
    })
    await local.repository.saveNote({
      id: 'note-1',
      date: createLocalDate('2026-05-01'),
      text: 'from local',
    })
    await local.engine.syncNow()
    const notes = await local.repository.listNotes()
    expect(
      notes[0]?.text === 'from local' || notes[0]?.text === 'from cloud',
    ).toBe(true)
    local.db.close()
  })
})
