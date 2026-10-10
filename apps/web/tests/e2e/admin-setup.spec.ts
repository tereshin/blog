import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

const base_url = process.env['E2E_BASE_URL']
if (base_url) test.use({ baseURL: base_url })

const THREE_COLUMNS = 1280
const LEFT_COLUMN = 768
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64')

function hasThreeColumns(page: Page): boolean {
  return (page.viewportSize()?.width ?? 0) >= THREE_COLUMNS
}

function hasLeftColumn(page: Page): boolean {
  return (page.viewportSize()?.width ?? 0) >= LEFT_COLUMN
}

test.describe('Настройки площадки', () => {
  test('суперадминистратор создаёт тему, и она появляется в левой карточке', async ({ page }) => {
    test.skip(!hasLeftColumn(page), 'Левый столбец виден от 768px')
    await page.addInitScript(() => window.localStorage.setItem('mock_viewer', 'superadmin'))
    await page.goto('/admin/topics')
    await page.getByLabel('Название').fill('Города')
    await page.getByLabel('Описание').fill('Городские истории')
    await page.getByLabel('Адрес').fill('goroda')
    await page.getByRole('button', { name: 'Сохранить' }).click()
    const link = page.getByRole('navigation', { name: 'Навигация' }).getByRole('link', { name: 'Города' })
    await expect(link).toBeVisible()
    await expect(link).toHaveAttribute('href', '/t/goroda')
  })

  test('загруженный логотип виден гостю в шапке', async ({ page }) => {
    await page.addInitScript(() => window.localStorage.setItem('mock_viewer', 'superadmin'))
    await page.goto('/admin/settings')
    await page.getByRole('button', { name: 'Логотип', exact: true }).locator('..').locator('input[type="file"]').setInputFiles({ name: 'logo.png', mimeType: 'image/png', buffer: PNG })
    await page.getByRole('button', { name: 'Сохранить' }).click()
    await page.evaluate(() => window.localStorage.setItem('mock_viewer', 'guest'))
    await page.goto('/')
    await expect(page.getByRole('banner').getByRole('img', { name: 'Блог' })).toBeVisible()
  })

  test('смена языка на английский меняет подписи, заголовки статей остаются', async ({ page }) => {
    test.skip(!hasLeftColumn(page), 'Левый столбец виден от 768px')
    await page.addInitScript(() => window.localStorage.setItem('mock_viewer', 'superadmin'))
    await page.goto('/admin/settings')
    await page.getByLabel('Язык').selectOption('en')
    await page.getByRole('button', { name: 'Сохранить' }).click()
    await expect(page.getByRole('button', { name: 'Write' })).toBeVisible()
    await page.goto('/')
    await expect(page.getByRole('navigation', { name: 'Navigation' }).getByRole('link', { name: 'Fresh' })).toBeVisible()
    await expect(page.getByRole('heading', { name: /Статья 1:/ })).toBeVisible()
  })

  test('«О проекте» открывается в центре, боковые карточки на месте', async ({ page }) => {
    test.skip(!hasLeftColumn(page), 'Левый столбец виден от 768px')
    await page.addInitScript(() => window.localStorage.setItem('mock_viewer', 'member'))
    await page.goto('/')
    await page.getByRole('button', { name: 'Меню учётной записи' }).click()
    await page.getByRole('menuitem', { name: 'О проекте' }).click()
    await expect(page.getByRole('heading', { name: 'О проекте' })).toBeVisible()
    await expect(page.getByText('Площадка для статей и обсуждений.')).toBeVisible()
    await expect(page.getByRole('navigation', { name: 'Навигация' })).toBeVisible()
    if (hasThreeColumns(page)) await expect(page.getByRole('complementary', { name: 'Популярные комментарии' })).toBeVisible()
  })

  test('администратор на настройках площадки видит объяснение в центре', async ({ page }) => {
    await page.addInitScript(() => window.localStorage.setItem('mock_viewer', 'admin'))
    await page.goto('/admin/settings')
    await expect(page.getByText('Раздел доступен только администратору площадки')).toBeVisible()
    if (hasLeftColumn(page)) await expect(page.getByRole('navigation', { name: 'Навигация' })).toBeVisible()
    if (hasThreeColumns(page)) await expect(page.getByRole('complementary', { name: 'Популярные комментарии' })).toBeVisible()
  })
  test('суперадминистратор загружает иконку статуса, участник видит её рядом с именем', async ({ page }) => {
    await page.addInitScript(() => {
      if (!window.localStorage.getItem('mock_viewer')) window.localStorage.setItem('mock_viewer', 'superadmin')
    })
    await page.goto('/admin/settings')
    const field = page.getByRole('group', { name: 'Иконки статусов профиля' })
    await field.locator('input[type="file"]').setInputFiles({ name: 'status.png', mimeType: 'image/png', buffer: PNG })
    await field.getByLabel('Название статуса', { exact: true }).fill('В отпуске')
    const saved = page.waitForResponse((response) => response.url().endsWith('/v1/settings') && response.request().method() === 'PUT')
    await page.getByRole('button', { name: 'Сохранить', exact: true }).click()
    const response = await saved
    expect(response.ok()).toBe(true)
    expect(response.request().postDataJSON().profile_status_icons).toEqual([expect.objectContaining({ label: 'В отпуске' })])
    await page.evaluate(() => window.localStorage.setItem('mock_viewer', 'member'))
    await page.goto('/u/reader')
    await page.getByRole('button', { name: 'Выбрать статус', exact: true }).click()
    await expect(page.getByRole('menuitemradio', { name: 'В отпуске', exact: true })).toBeVisible()
  })

})
