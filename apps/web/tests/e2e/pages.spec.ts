import { expect, test } from '@playwright/test'
test('published page is readable as guest inside the usual shell', async ({ page }) => {
  test.skip(process.env['E2E_TARGET'] === 'local')
  await page.goto('/pages/welcome-page')
  await expect(page.getByRole('heading', { name: 'Добро пожаловать', exact: true })).toBeVisible()
  await expect(page.getByText('Информация о площадке')).toBeVisible()
  await expect(page.getByRole('banner')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Комментировать' })).toHaveCount(0)
})
test('unknown page uses not-found content without replacing the shell', async ({ page }) => {
  await page.goto('/pages/missing-page')
  await expect(page.getByText('Страница не найдена', { exact: true })).toBeVisible()
  await expect(page.getByRole('banner')).toBeVisible()
})
