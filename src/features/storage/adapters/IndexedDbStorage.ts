import type { RawAppStorage } from './AppStorage'
import type { PeachDatabase } from '../db/PeachDatabase'

export class IndexedDbStorage implements RawAppStorage {
  private readonly db: PeachDatabase

  constructor(db: PeachDatabase) {
    this.db = db
  }

  async getRaw(key: string): Promise<string | null> {
    const row = await this.db.kv.get(key)
    return row?.value ?? null
  }

  async setRaw(key: string, value: string): Promise<void> {
    await this.db.kv.put({ key, value })
  }

  async get<T>(key: string): Promise<T | null> {
    const raw = await this.getRaw(key)
    if (raw === null) return null
    return JSON.parse(raw) as T
  }

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters -- mirrors AppStorage
  async set<T>(key: string, value: T): Promise<void> {
    await this.setRaw(key, JSON.stringify(value))
  }

  async remove(key: string): Promise<void> {
    await this.db.kv.delete(key)
  }

  async clear(): Promise<void> {
    await this.db.kv.clear()
  }

  async keys(): Promise<string[]> {
    return this.db.kv.toCollection().primaryKeys()
  }

  async getManyRaw(
    keys: readonly string[],
  ): Promise<Record<string, string | null>> {
    const rows = await this.db.kv.bulkGet([...keys])
    return Object.fromEntries(
      keys.map((key, index) => [key, rows[index]?.value ?? null]),
    )
  }

  async removeMany(keys: readonly string[]): Promise<void> {
    await this.db.kv.bulkDelete([...keys])
  }
}
