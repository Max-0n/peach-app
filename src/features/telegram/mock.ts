import type { TelegramKeyValueApi } from '../storage/adapters/TelegramStorage'
import type { TelegramWebApp } from './types'

function createMemoryStore(): TelegramKeyValueApi {
  const values = new Map<string, string>()
  return {
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
    clear: (callback) => {
      values.clear()
      callback?.(null, true)
    },
    getKeys: (callback) => {
      callback(null, [...values.keys()])
    },
    getItems: (keys, callback) => {
      callback(
        null,
        Object.fromEntries(
          keys.flatMap((key) => {
            const value = values.get(key)
            return value === undefined ? [] : [[key, value]]
          }),
        ),
      )
    },
    removeItems: (keys, callback) => {
      for (const key of keys) {
        values.delete(key)
      }
      callback?.(null, true)
    },
  }
}

export function createMockWebApp(): TelegramWebApp {
  const listeners = new Map<string, Set<() => void>>()
  let backVisible = false
  let mainVisible = false
  let mainText = ''
  const backClicks = new Set<() => void>()
  const mainClicks = new Set<() => void>()

  return {
    initData: 'user=%7B%22id%22%3A1%7D',
    initDataUnsafe: {
      user: {
        id: 1,
        first_name: 'Ada',
        language_code: 'en',
      },
    },
    version: '9.0',
    platform: 'tdesktop',
    colorScheme: 'light',
    themeParams: {
      bg_color: '#f3eadf',
      text_color: '#3b322c',
      button_color: '#8a5c52',
      button_text_color: '#faf4eb',
    },
    viewportHeight: 720,
    viewportStableHeight: 720,
    isExpanded: true,
    safeAreaInset: { top: 0, right: 0, bottom: 0, left: 0 },
    ready: () => undefined,
    expand: () => undefined,
    onEvent: (event, handler) => {
      const bucket = listeners.get(event) ?? new Set<() => void>()
      bucket.add(handler)
      listeners.set(event, bucket)
    },
    offEvent: (event, handler) => {
      listeners.get(event)?.delete(handler)
    },
    BackButton: {
      get isVisible() {
        return backVisible
      },
      show: () => {
        backVisible = true
      },
      hide: () => {
        backVisible = false
      },
      onClick: (fn) => {
        backClicks.add(fn)
      },
      offClick: (fn) => {
        backClicks.delete(fn)
      },
    },
    MainButton: {
      get text() {
        return mainText
      },
      get isVisible() {
        return mainVisible
      },
      setText: (text) => {
        mainText = text
      },
      show: () => {
        mainVisible = true
      },
      hide: () => {
        mainVisible = false
      },
      onClick: (fn) => {
        mainClicks.add(fn)
      },
      offClick: (fn) => {
        mainClicks.delete(fn)
      },
      enable: () => undefined,
      disable: () => undefined,
    },
    HapticFeedback: {
      impactOccurred: () => undefined,
      notificationOccurred: () => undefined,
      selectionChanged: () => undefined,
    },
    CloudStorage: createMemoryStore(),
    DeviceStorage: createMemoryStore(),
    checkHomeScreenStatus: (callback) => {
      callback('missed')
    },
    addToHomeScreen: () => undefined,
  }
}
