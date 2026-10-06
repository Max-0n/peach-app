import { randomUUID } from '../../lib/randomId'

export const SOURCE_ID_KEY = 'peach-source-id'

export function getOrCreateSourceId(): string {
  const existing = localStorage.getItem(SOURCE_ID_KEY)
  if (existing !== null && existing.length > 0) {
    return existing
  }
  const created = randomUUID()
  localStorage.setItem(SOURCE_ID_KEY, created)
  return created
}
