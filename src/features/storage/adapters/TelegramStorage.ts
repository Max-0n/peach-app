import type { RawAppStorage } from './AppStorage'

export class StorageUnavailableError extends Error {
  readonly status = 'unavailable' as const

  constructor(message = 'Storage is temporarily unavailable.') {
    super(message)
    this.name = 'StorageUnavailableError'
  }
}

type TelegramCallback<T> = (error: unknown, result?: T) => void

export interface TelegramKeyValueApi {
  setItem: (
    key: string,
    value: string,
    callback?: TelegramCallback<boolean>,
  ) => void
  getItem: (
    key: string,
    callback: TelegramCallback<string | null | undefined>,
  ) => void
  removeItem: (key: string, callback?: TelegramCallback<boolean>) => void
  clear?: (callback?: TelegramCallback<boolean>) => void
  getKeys?: (callback: TelegramCallback<string[]>) => void
  getItems?: (
    keys: string[],
    callback: TelegramCallback<Record<string, string>>,
  ) => void
  removeItems?: (keys: string[], callback?: TelegramCallback<boolean>) => void
}

function toUnavailable(): StorageUnavailableError {
  return new StorageUnavailableError()
}

function callTelegram<T>(
  invoke: (callback: TelegramCallback<T>) => void,
): Promise<T> {
  return new Promise((resolve, reject) => {
    try {
      invoke((error, result) => {
        if (error) {
          reject(toUnavailable())
          return
        }
        resolve(result as T)
      })
    } catch {
      reject(toUnavailable())
    }
  })
}

class TelegramKvStorage implements RawAppStorage {
  private readonly api: TelegramKeyValueApi | null

  constructor(api: TelegramKeyValueApi | null) {
    this.api = api
  }

  private requireApi(): TelegramKeyValueApi {
    if (this.api === null) throw toUnavailable()
    return this.api
  }

  async getRaw(key: string): Promise<string | null> {
    const api = this.requireApi()
    const value = await callTelegram<string | null | undefined>((callback) => {
      api.getItem(key, callback)
    })
    return value === undefined || value === '' ? null : value
  }

  async setRaw(key: string, value: string): Promise<void> {
    const api = this.requireApi()
    await callTelegram<boolean>((callback) => {
      api.setItem(key, value, callback)
    })
  }

  async get<T>(key: string): Promise<T | null> {
    const raw = await this.getRaw(key)
    if (raw === null) return null
    try {
      return JSON.parse(raw) as T
    } catch {
      throw toUnavailable()
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters -- mirrors AppStorage
  async set<T>(key: string, value: T): Promise<void> {
    await this.setRaw(key, JSON.stringify(value))
  }

  async remove(key: string): Promise<void> {
    const api = this.requireApi()
    await callTelegram<boolean>((callback) => {
      api.removeItem(key, callback)
    })
  }

  async clear(): Promise<void> {
    const api = this.requireApi()
    if (api.clear) {
      await callTelegram<boolean>((callback) => {
        api.clear?.(callback)
      })
      return
    }
    const keys = await this.keys()
    await this.removeMany(keys)
  }

  async keys(): Promise<string[]> {
    const api = this.requireApi()
    if (api.getKeys) {
      return callTelegram<string[]>((callback) => {
        api.getKeys?.(callback)
      })
    }
    throw toUnavailable()
  }

  async getManyRaw(
    keys: readonly string[],
  ): Promise<Record<string, string | null>> {
    const api = this.requireApi()
    if (api.getItems && keys.length > 0) {
      const values = await callTelegram<Record<string, string>>((callback) => {
        api.getItems?.([...keys], callback)
      })
      return Object.fromEntries(keys.map((key) => [key, values[key] ?? null]))
    }
    const entries = await Promise.all(
      keys.map(async (key) => [key, await this.getRaw(key)] as const),
    )
    return Object.fromEntries(entries)
  }

  async removeMany(keys: readonly string[]): Promise<void> {
    const api = this.requireApi()
    if (keys.length === 0) return
    if (api.removeItems) {
      await callTelegram<boolean>((callback) => {
        api.removeItems?.([...keys], callback)
      })
      return
    }
    await Promise.all(keys.map((key) => this.remove(key)))
  }
}

export class TelegramCloudStorage extends TelegramKvStorage {}
export class TelegramDeviceStorage extends TelegramKvStorage {}
