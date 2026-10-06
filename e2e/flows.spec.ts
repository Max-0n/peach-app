import { readFile } from 'node:fs/promises'
import { expect, test } from '@playwright/test'
import { skipOnboarding } from './helpers.ts'

test('onboarding can be skipped into the home shell', async ({ page }) => {
  await skipOnboarding(page)
  await expect(
    page.getByRole('navigation', { name: 'Primary' }).first(),
  ).toBeVisible()
})

test('logs a period from a date range', async ({ page }) => {
  await skipOnboarding(page)
  await page.getByRole('button', { name: 'Log period' }).click()
  const dialog = page.getByRole('dialog', { name: 'Period' })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByText('Flow (optional)')).toHaveCount(0)
  await dialog.locator('[data-date][aria-current="date"]').click()
  await dialog.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByText('Cycle day')).toBeVisible()
})

test('logs symptoms and shows them on the calendar day', async ({ page }) => {
  await skipOnboarding(page)
  await page.getByRole('link', { name: 'Calendar' }).first().click()
  await page.locator('[data-date][aria-current="date"]').click()
  await page.getByRole('button', { name: 'Notes' }).click()
  const dialog = page.getByRole('dialog', { name: 'Day log' })
  await dialog.getByRole('button', { name: 'Cramps' }).click()
  await dialog.getByRole('button', { name: 'Save' }).click()
  await page.locator('[data-date][aria-current="date"]').click()
  await expect(page.getByRole('region', { name: 'Day details' })).toContainText(
    'Cramps',
  )
})

test('logs weight and shows it on insights', async ({ page }) => {
  await skipOnboarding(page)
  await page.getByRole('link', { name: 'Calendar' }).first().click()
  await page.locator('[data-date][aria-current="date"]').click()
  await page.getByRole('button', { name: 'Notes' }).click()
  const dialog = page.getByRole('dialog', { name: 'Day log' })
  await dialog.getByLabel('Weight (kg)').fill('62.5')
  await dialog.getByRole('button', { name: 'Save' }).click()
  await page.getByRole('link', { name: 'Insights' }).first().click()
  await expect(page.getByRole('heading', { name: 'Insights' })).toBeVisible()
  await expect(page.getByText('62.5').first()).toBeVisible()
})

test('exports a UTF-8 BOM CSV from profile', async ({ page }) => {
  await skipOnboarding(page)
  await page.getByRole('button', { name: 'Log period' }).click()
  const dialog = page.getByRole('dialog', { name: 'Period' })
  await dialog.locator('[data-date][aria-current="date"]').click()
  await dialog.getByRole('button', { name: 'Save' }).click()
  await page.getByRole('link', { name: 'Profile' }).first().click()
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export CSV' }).click(),
  ])
  const path = await download.path()
  expect(path).toBeTruthy()
  const bytes = await readFile(path)
  expect(bytes[0]).toBe(0xef)
  expect(bytes[1]).toBe(0xbb)
  expect(bytes[2]).toBe(0xbf)
  expect(bytes.toString('utf8')).toContain('date,cycle_day,cycle_phase')
})
