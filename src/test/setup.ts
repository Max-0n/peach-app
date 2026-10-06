import 'fake-indexeddb/auto'
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import Dexie from 'dexie'
import { afterEach } from 'vitest'
import { useLocaleStore } from '../app/i18n/locale-store'

class ResizeObserverStub {
  observe(): void {
    return undefined
  }
  unobserve(): void {
    return undefined
  }
  disconnect(): void {
    return undefined
  }
}

globalThis.ResizeObserver = ResizeObserverStub

afterEach(async () => {
  cleanup()
  useLocaleStore.setState({ locale: 'en' })
  localStorage.clear()
  await Dexie.delete('peach')
})
