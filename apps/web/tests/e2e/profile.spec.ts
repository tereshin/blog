import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

const base_url = process.env['E2E_BASE_URL']
if (base_url) test.use({ baseURL: base_url })

const WIDE = 1200

function isWide(page: Page): boolean {
  return (page.viewportSize()?.width ?? 0) >= WIDE
}

test.describe('Профиль и рейтинг', () => {
  test.beforeEach(async ({ page }) => {
    page.setDefaultTimeout(20_000)
  })

  test('свой профиль без обложки показывает правку, сортировку и полосу охвата', async ({ page }) => {
    await page.addInitScript(() => window.localStorage.setItem('mock_viewer', 'member'))
    await page.goto('/u/reader')
    await expect(page.getByRole('button', { name: 'Добавить обложку' })).toBeVisible({ timeout: 20_000 })
    await expect(page.getByRole('heading', { name: 'Роман Читаев' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Редактировать' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Статистика' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Настройки' })).toBeVisible()
    await expect(page.getByText('0', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('с 2024')).toBeVisible()
    await expect(page.getByRole('tab', { name: 'Посты' })).toHaveAttribute('aria-selected', 'true')
    await expect(page.getByRole('button', { name: 'Свежее' })).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByText('Купить показы')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Как устроена лента' })).toBeVisible()
    if (isWide(page)) await expect(page.getByRole('navigation', { name: 'Навигация' })).toBeVisible()
    await expect(page.getByRole('complementary', { name: 'Популярные комментарии' })).toBeVisible()
  })

  test('чужой профиль предлагает подписаться и не показывает правку', async ({ page }) => {
    await page.goto('/u/anna')
    await expect(page.getByRole('button', { name: 'Подписаться' })).toBeDisabled({ timeout: 20_000 })
    await expect(page.getByRole('button', { name: 'Редактировать' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Добавить обложку' })).toHaveCount(0)
    await expect(page.getByText('Купить показы')).toHaveCount(0)
    if (isWide(page)) await expect(page.getByRole('navigation', { name: 'Навигация' })).toBeVisible()
    await expect(page.getByRole('complementary', { name: 'Популярные комментарии' })).toBeVisible()
  })

  test('вкладка «Комментарии» показывает фрагмент, название и дату', async ({ page }) => {
    await page.addInitScript(() => window.localStorage.setItem('mock_viewer', 'member'))
    await page.goto('/u/reader')
    await page.getByRole('tab', { name: 'Комментарии' }).click({ timeout: 20_000 })
    await expect(page.getByText('Главное — стабильный порядок.')).toBeVisible()
    await expect(page.getByText('Как устроена лента')).toBeVisible()
    await expect(page.locator('time')).toBeVisible()
  })

  test('рейтинг подсвечивает пункт «Рейтинг»', async ({ page }) => {
    test.skip(!isWide(page), 'Левая карточка закреплена только от 1200px')
    await page.goto('/rating')
    await expect(page.getByRole('navigation', { name: 'Навигация' }).getByRole('link', { name: 'Рейтинг' })).toHaveAttribute('aria-current', 'page', { timeout: 20_000 })
    await expect(page.getByRole('heading', { name: 'Рейтинг' })).toBeVisible()
  })
})
