import { createDataLayer } from '../features/storage'
import { SOURCE_ID_KEY } from '../features/telegram/sourceId'

export async function seedOnboarded(): Promise<void> {
  const sourceId = 'test-source'
  localStorage.setItem(SOURCE_ID_KEY, sourceId)
  const { repository, db } = createDataLayer({ sourceId })
  await repository.saveSettings({
    onboardingCompleted: true,
    locale: 'en',
  })
  db.close()
}
