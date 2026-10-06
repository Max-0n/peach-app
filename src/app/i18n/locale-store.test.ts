import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createLocaleStore,
  LOCALE_STORAGE_KEY,
  LOCALE_STORAGE_VERSION,
} from './locale-store'

describe('persisted locale state', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.stubGlobal('navigator', { language: 'de-DE' })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it.each([
    ['invalid JSON', '{'],
    [
      'invalid locale',
      JSON.stringify({
        state: { locale: 'de' },
        version: LOCALE_STORAGE_VERSION,
      }),
    ],
    [
      'unknown future version',
      JSON.stringify({ state: { locale: 'ru' }, version: 99 }),
    ],
  ])('falls back to the default locale for %s', (_case, storedValue) => {
    localStorage.setItem(LOCALE_STORAGE_KEY, storedValue)

    const store = createLocaleStore(localStorage)

    expect(store.getState().locale).toBe('ru')
  })

  it('migrates valid version-zero state', () => {
    localStorage.setItem(
      LOCALE_STORAGE_KEY,
      JSON.stringify({ state: { locale: 'ru' }, version: 0 }),
    )

    const store = createLocaleStore(localStorage)

    expect(store.getState().locale).toBe('ru')
  })
})
