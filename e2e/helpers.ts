import { expect, type Page } from '@playwright/test'

export async function skipOnboarding(page: Page): Promise<void> {
  await page.goto('/')
  await expect(
    page.getByRole('heading', { name: 'Your usual rhythm' }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Start' }).click()
  await expect(
    page.getByRole('heading', { name: 'A quiet view of today.' }),
  ).toBeVisible()
}
