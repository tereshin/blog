import { expect, test } from '@playwright/test'

test('font picker searches, previews, saves and restores the site font', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('mock_viewer', 'superadmin'))
  await page.route('https://fonts.googleapis.com/**', (route) =>
    route.fulfill({
      contentType: 'text/css',
      body: '/* font network is independent of settings persistence */',
    }),
  )
  await page.goto('/admin/settings/general')
  const picker = page.getByRole('combobox', { name: 'Шрифт площадки' })
  await expect(picker).toHaveValue('Inter')
  const initial_family = await page
    .locator('body')
    .evaluate((node) => getComputedStyle(node).fontFamily)
  expect(initial_family).toContain('Inter Variable')
  await picker.fill('Roboto')
  await expect(page.getByRole('option', { name: 'Roboto', exact: true })).toBeVisible()
  await picker.press('ArrowDown')
  await picker.press('Enter')
  await expect(picker).toHaveValue('Roboto')
  // Preview does not apply unsaved changes to the page.
  expect(await page.locator('body').evaluate((node) => getComputedStyle(node).fontFamily)).toBe(
    initial_family,
  )
  const request = page.waitForRequest(
    (req) => req.method() === 'PUT' && req.url().endsWith('/v1/settings'),
  )
  await page.getByRole('button', { name: 'Сохранить', exact: true }).click()
  expect((await request).postDataJSON().font_family).toBe('Roboto')
  await expect
    .poll(() => page.locator('body').evaluate((node) => getComputedStyle(node).fontFamily))
    .toContain('Roboto')
  await page.reload()
  await expect(picker).toHaveValue('Roboto')
  await expect
    .poll(() => page.locator('body').evaluate((node) => getComputedStyle(node).fontFamily))
    .toContain('Roboto')
  await picker.fill('Inter')
  await page.getByRole('option', { name: 'Inter', exact: true }).click()
  await page.getByRole('button', { name: 'Сохранить', exact: true }).click()
  await expect
    .poll(() => page.locator('body').evaluate((node) => getComputedStyle(node).fontFamily))
    .toBe(initial_family)
})

test('the full font catalog stays virtualized and fits the viewport', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('mock_viewer', 'superadmin'))
  await page.goto('/admin/settings/general')
  const picker = page.getByRole('combobox', { name: 'Шрифт площадки' })
  await picker.fill('')
  await picker.press('ArrowDown')
  await expect(page.getByRole('listbox')).toBeVisible()
  expect(await page.getByRole('option').count()).toBeLessThan(60)
  const box = await page.getByRole('listbox').boundingBox()
  const viewport = page.viewportSize()
  if (!box || !viewport) throw new Error('Missing listbox bounds')
  expect(box.width).toBeLessThanOrEqual(viewport.width - 16)
  await picker.fill('Abel')
  await page.getByRole('option', { name: 'Abel', exact: true }).click()
  await expect(page.getByText('В этом шрифте нет кириллицы.', { exact: false })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})
