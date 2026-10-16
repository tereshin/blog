import { expect, test } from '@playwright/test'

// API enforcement is covered by gateway integration tests; exercise the real settings and login UI here.
test('maintenance can be enabled and disabled while administrators retain access', async ({
  page,
}, info) => {
  test.skip(process.env['E2E_TARGET'] === 'local')
  await page.addInitScript(() => {
    if (!localStorage.getItem('mock_viewer')) localStorage.setItem('mock_viewer', 'superadmin')
  })
  await page.goto('/admin/settings/access')
  const toggle = page.getByRole('switch', { name: 'Режим Maintenance' })
  await expect(toggle).not.toBeChecked()
  await page.getByText('Режим Maintenance', { exact: true }).click()
  await expect(toggle).toBeChecked()
  await page.getByRole('button', { name: 'Сохранить', exact: true }).click()
  await expect(page.getByText('Настройки сохранены', { exact: true })).toBeVisible()
  await page.reload()
  await expect(toggle).toBeChecked()

  for (const role of ['guest', 'member']) {
    await page.evaluate((viewer) => localStorage.setItem('mock_viewer', viewer), role)
    await page.goto('/p/does-not-matter')
    await expect(page.getByRole('heading', { name: 'Технические работы' })).toBeVisible()
    await expect(page.getByRole('banner')).toHaveCount(0)
    await expect(page.getByRole('navigation')).toHaveCount(0)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({ path: info.outputPath(`maintenance-${role}.png`), fullPage: true })
    await page.getByRole('button', { name: 'Вход для администратора' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
  }
  await page.evaluate(() => localStorage.setItem('mock_viewer', 'admin'))
  await page.goto('/')
  await expect(page.getByRole('banner')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Технические работы' })).toHaveCount(0)

  await page.evaluate(() => localStorage.setItem('mock_viewer', 'superadmin'))
  await page.goto('/admin/settings/access')
  await toggle.focus()
  await page.keyboard.press('Space')
  await expect(toggle).not.toBeChecked()
  await page.getByRole('button', { name: 'Сохранить', exact: true }).click()
  await expect(page.getByText('Настройки сохранены', { exact: true })).toBeVisible()
  await page.evaluate(() => localStorage.setItem('mock_viewer', 'guest'))
  await page.goto('/')
  await expect(page.getByRole('banner')).toBeVisible()
})
