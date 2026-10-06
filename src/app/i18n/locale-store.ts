import { create } from 'zustand'
import {
  createJSONStorage,
  persist,
  type StateStorage,
} from 'zustand/middleware'
import { z } from 'zod'
import type { Locale } from './dictionary'

export const LOCALE_STORAGE_KEY = 'peach-locale'
export const LOCALE_STORAGE_VERSION = 1

const persistedLocaleSchema = z.object({
  state: z.object({ locale: z.enum(['en', 'ru']) }),
  version: z.number().int(),
})

interface LocaleState {
  locale: Locale
  setLocale: (locale: Locale) => void
}

export function detectBrowserLocale(): Locale | null {
  if (typeof navigator === 'undefined') {
    return null
  }
  const language = navigator.language.toLowerCase()
  if (language.startsWith('en')) {
    return 'en'
  }
  if (language.startsWith('ru')) {
    return 'ru'
  }
  return null
}

function defaultLocale(): Locale {
  return detectBrowserLocale() ?? 'ru'
}

function validatedStorage(storage: StateStorage): StateStorage {
  return {
    getItem: (name) => {
      const raw = storage.getItem(name)
      if (raw instanceof Promise) {
        return raw.then((value) => validateStoredValue(value))
      }
      return validateStoredValue(raw)
    },
    removeItem: (name) => storage.removeItem(name),
    setItem: (name, value) => storage.setItem(name, value),
  }
}

function validateStoredValue(raw: string | null): string | null {
  if (!raw) {
    return null
  }

  try {
    const result = persistedLocaleSchema.safeParse(JSON.parse(raw))
    if (
      !result.success ||
      (result.data.version !== 0 &&
        result.data.version !== LOCALE_STORAGE_VERSION)
    ) {
      return null
    }
    return JSON.stringify(result.data)
  } catch {
    return null
  }
}

export function createLocaleStore(storage: StateStorage) {
  return create<LocaleState>()(
    persist(
      (set) => ({
        locale: defaultLocale(),
        setLocale: (locale) => {
          set({ locale })
        },
      }),
      {
        name: LOCALE_STORAGE_KEY,
        version: LOCALE_STORAGE_VERSION,
        storage: createJSONStorage(() => validatedStorage(storage)),
        migrate: (persistedState, version) => {
          const result = z
            .object({ locale: z.enum(['en', 'ru']) })
            .safeParse(persistedState)

          return {
            locale:
              version === 0 && result.success
                ? result.data.locale
                : defaultLocale(),
          }
        },
        merge: (persistedState, currentState) => {
          const result = z
            .object({ locale: z.enum(['en', 'ru']) })
            .safeParse(persistedState)
          return {
            ...currentState,
            locale: result.success ? result.data.locale : defaultLocale(),
          }
        },
      },
    ),
  )
}

export const useLocaleStore = createLocaleStore(window.localStorage)
