import { expect, test } from '@playwright/test'

const is_local = process.env['E2E_TARGET'] === 'local'

test.describe('длинная лента', () => {
  test.skip(!is_local, 'нужен Compose с большим seed (E2E_TARGET=local)')

  test('первая страница главной укладывается в 2 с', async ({ page }) => {
    const started = Date.now()
    await page.goto('/')
    await expect(page.getByRole('main').getByRole('article').first()).toBeVisible()
    expect(Date.now() - started).toBeLessThan(2_000)
  })
})
