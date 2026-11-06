import { expect, test } from '@playwright/test'

test('superadmin configures image compression and R2 without reading saved keys', async ({
  page,
}, test_info) => {
  test.skip(process.env['E2E_TARGET'] === 'local')
  await page.addInitScript(() => localStorage.setItem('mock_viewer', 'superadmin'))
  await page.goto('/admin/settings')
  if (test_info.project.name === 'wide-light') {
    await page.getByRole('link', { name: 'Тёмная тема', exact: true }).click()
    await page.getByRole('menuitemradio', { name: 'Светлая', exact: true }).click()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  }
  await page.getByRole('link', { name: /Изображения и хранилище/ }).click()
  await expect(
    page.getByRole('heading', { name: 'Изображения и хранилище', exact: true }),
  ).toBeVisible()
  await page.getByRole('spinbutton', { name: 'Качество (1–100)', exact: true }).fill('75')
  await page
    .getByRole('spinbutton', { name: 'Максимальная сторона (px)', exact: true })
    .fill('1920')
  await page.getByText('Использовать своё S3-хранилище', { exact: true }).click()
  await page.getByRole('button', { name: 'Настроить для Cloudflare R2' }).click()
  await expect(page.getByRole('textbox', { name: 'Регион', exact: true })).toHaveValue('auto')
  await page
    .getByRole('textbox', { name: 'S3 Endpoint', exact: true })
    .fill('https://account.r2.cloudflarestorage.com')
  await page.getByRole('textbox', { name: 'Bucket', exact: true }).fill('blog-images')
  await page
    .getByRole('textbox', { name: 'Публичный URL файлов', exact: true })
    .fill('https://media.example.com')
  await page.getByLabel('Access Key ID', { exact: true }).fill('test-access')
  await page.getByLabel('Secret Access Key', { exact: true }).fill('test-secret')
  await page.getByRole('button', { name: 'Проверить подключение', exact: true }).click()
  await expect(
    page
      .getByRole('status')
      .filter({ hasText: 'Запись, чтение и удаление тестового файла прошли успешно.' }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Сохранить', exact: true }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Настройки сохранены.' })).toBeVisible()
  await expect(page.getByLabel('Access Key ID', { exact: true })).toHaveValue('')
  await expect(page.getByLabel('Secret Access Key', { exact: true })).toHaveValue('')
  await expect(page.getByRole('spinbutton', { name: 'Качество (1–100)', exact: true })).toHaveValue(
    '75',
  )
  await expect(
    page.getByRole('spinbutton', { name: 'Максимальная сторона (px)', exact: true }),
  ).toHaveValue('1920')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: test_info.outputPath('media-settings.png'), fullPage: true })
})

test('members cannot open media administration', async ({ page }) => {
  test.skip(process.env['E2E_TARGET'] === 'local')
  await page.addInitScript(() => localStorage.setItem('mock_viewer', 'member'))
  await page.goto('/admin/settings/media')
  await expect(page.getByText('Раздел доступен только администратору площадки', { exact: true })).toBeVisible()
  await expect(
    page.getByRole('heading', { name: 'Изображения и хранилище', exact: true }),
  ).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Сохранить', exact: true })).toHaveCount(0)
})
