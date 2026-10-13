import { expect, test } from '@playwright/test'

test.describe('секции сайдбара', () => {
  test.use({ viewport: { width: 1280, height: 900 } })

  test('своя секция сворачивается и прячет системную тему', async ({ page }) => {
    await page.goto('/')
    const nav = page.getByRole('navigation', { name: 'Навигация' })
    const topics = nav.getByRole('region', { name: 'Темы' })
    const custom = nav.getByRole('region', { name: 'О площадке' })
    await expect(topics.getByRole('button', { name: 'Темы' })).toHaveAttribute('aria-expanded', 'true')
    await expect(custom.getByRole('link', { name: 'О проекте' })).toBeVisible()
    await expect(custom.getByRole('link', { name: 'Системная тема', exact: true })).toBeVisible()
    await expect(topics.getByRole('link', { name: 'Системная тема', exact: true })).toHaveCount(0)
    await custom.getByRole('button', { name: 'О площадке' }).click()
    await expect(custom.getByRole('button', { name: 'О площадке' })).toHaveAttribute('aria-expanded', 'false')
    await expect(custom.getByRole('link', { name: 'О проекте' })).toHaveCount(0)
    await expect(custom.getByRole('link', { name: 'Системная тема', exact: true })).toHaveCount(0)
    await page.reload()
    await expect(nav.getByRole('button', { name: 'О площадке' })).toHaveAttribute('aria-expanded', 'false')
    await nav.getByRole('button', { name: 'О площадке' }).click()
    await custom.getByRole('link', { name: 'О проекте' }).click()
    await expect(page).toHaveURL('/pages/welcome-page')
    await expect(nav.getByRole('link', { name: 'О проекте' })).toHaveAttribute('aria-current', 'page')
  })

  test('без своих секций системная тема остаётся в темах', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('mock_nav_sections', 'empty'))
    await page.goto('/')
    const topics = page.getByRole('navigation', { name: 'Навигация' }).getByRole('region', { name: 'Темы' })
    await expect(topics.getByRole('link', { name: 'Системная тема', exact: true })).toBeVisible()
    await expect(page.getByRole('region', { name: 'О площадке' })).toHaveCount(0)
    await topics.getByRole('button', { name: 'Темы' }).click()
    await expect(topics.getByRole('link', { name: 'Системная тема', exact: true })).toHaveCount(0)
  })

  test('суперадмин создаёт секцию и пункт-ссылку', async ({ page }) => {
    test.skip(process.env['E2E_TARGET'] === 'local', 'Роль в local покрывается отдельным сценарием')
    await page.addInitScript(() => localStorage.setItem('mock_viewer', 'superadmin'))
    await page.goto('/admin/sections')
    await expect(page.getByRole('heading', { name: 'Секции сайдбара', level: 1 })).toBeVisible()
    await page.getByRole('button', { name: 'Создать секцию' }).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByLabel('Заголовок секции').fill('Ссылки')
    await dialog.getByRole('button', { name: 'Сохранить' }).click()
    const card = page.locator('li').filter({ has: page.getByRole('heading', { name: 'Ссылки', level: 2 }) })
    await card.getByRole('button', { name: 'Добавить пункт' }).click()
    const item_dialog = page.getByRole('dialog')
    await item_dialog.getByLabel('Заголовок', { exact: true }).fill('Правила')
    await item_dialog.locator('input[type="file"]').setInputFiles({
      name: 'bad.svg',
      mimeType: 'image/svg+xml',
      buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'),
    })
    await expect(item_dialog.getByRole('alert')).toHaveText('Нужен корректный SVG до 8 КБ')
    await item_dialog.locator('input[type="file"]').setInputFiles({
      name: 'rules.svg',
      mimeType: 'image/svg+xml',
      buffer: Buffer.from(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="8"/></svg>',
      ),
    })
    await expect(item_dialog.locator('span.inline-flex svg')).toBeVisible()
    await expect(item_dialog.getByRole('alert')).toHaveCount(0)
    await item_dialog.getByLabel('Куда ведёт').click()
    await page.getByRole('option', { name: 'Ссылка', exact: true }).click()
    await item_dialog.getByLabel('Адрес ссылки').fill('https://example.com/rules')
    await item_dialog.getByRole('button', { name: 'Сохранить' }).click()
    await expect(card.getByText('Правила', { exact: true })).toBeVisible()
  })
})
