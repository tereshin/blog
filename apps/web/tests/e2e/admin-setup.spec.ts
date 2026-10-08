import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

const base_url = process.env['E2E_BASE_URL']
if (base_url) test.use({ baseURL: base_url })

const WIDE = 1200
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64')

function isWide(page: Page): boolean {
  return (page.viewportSize()?.width ?? 0) >= WIDE
}

test.describe('Настройки площадки', () => {
  test('суперадминистратор создаёт тему, и она появляется в левой карточке', async ({ page }) => {
    test.skip(!isWide(page), 'Левая карточка закреплена только от 1200px')
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
    await page.locator('input[type="file"]').setInputFiles({ name: 'logo.png', mimeType: 'image/png', buffer: PNG })
    await page.getByRole('button', { name: 'Сохранить' }).click()
    await page.evaluate(() => window.localStorage.setItem('mock_viewer', 'guest'))
    await page.goto('/')
    await expect(page.getByRole('banner').getByRole('img', { name: 'Блог' })).toBeVisible()
  })

  test('смена языка на английский меняет подписи, заголовки статей остаются', async ({ page }) => {
    test.skip(!isWide(page), 'Левая карточка закреплена только от 1200px')
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
    test.skip(!isWide(page), 'Левая карточка закреплена только от 1200px')
    await page.addInitScript(() => window.localStorage.setItem('mock_viewer', 'member'))
    await page.goto('/')
    await page.getByRole('button', { name: 'Меню учётной записи' }).click()
    await page.getByRole('menuitem', { name: 'О проекте' }).click()
    await expect(page.getByRole('heading', { name: 'О проекте' })).toBeVisible()
    await expect(page.getByText('Площадка для статей и обсуждений.')).toBeVisible()
    await expect(page.getByRole('navigation', { name: 'Навигация' })).toBeVisible()
    await expect(page.getByRole('complementary', { name: 'Популярные комментарии' })).toBeVisible()
  })

  test('администратор на настройках площадки видит объяснение в центре', async ({ page }) => {
    await page.addInitScript(() => window.localStorage.setItem('mock_viewer', 'admin'))
    await page.goto('/admin/settings')
    await expect(page.getByText('Раздел доступен только администратору площадки')).toBeVisible()
    if (isWide(page)) await expect(page.getByRole('navigation', { name: 'Навигация' })).toBeVisible()
    await expect(page.getByRole('complementary', { name: 'Популярные комментарии' })).toBeVisible()
  })
})
