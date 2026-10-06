export interface AppStorage {
  get<T>(key: string): Promise<T | null>
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters -- required storage API
  set<T>(key: string, value: T): Promise<void>
  remove(key: string): Promise<void>
  clear(): Promise<void>
}

export interface RawAppStorage extends AppStorage {
  getRaw(key: string): Promise<string | null>
  setRaw(key: string, value: string): Promise<void>
  keys(): Promise<string[]>
  getManyRaw(keys: readonly string[]): Promise<Record<string, string | null>>
  removeMany(keys: readonly string[]): Promise<void>
}
