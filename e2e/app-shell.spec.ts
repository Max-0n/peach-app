import { expect, test } from '@playwright/test'
import { skipOnboarding } from './helpers.ts'

test('routes through the application shell', async ({ page }) => {
  await skipOnboarding(page)
  await page.goto('/insights')

  await expect(page.getByRole('heading', { name: 'Insights' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Quick add' })).toHaveCount(0)
  await expect(
    page.getByRole('link', { name: 'Insights' }).first(),
  ).toHaveAttribute('aria-current', 'page')
  await expect(page.getByRole('link', { name: 'Skip to content' })).toHaveCSS(
    'position',
    'fixed',
  )
})
