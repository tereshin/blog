import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

function isNarrow(page: Page) {
  return (page.viewportSize()?.width ?? 0) < 768
}

function leftNavigation(page: Page) {
  return page.getByRole('navigation', { name: 'Навигация', exact: true })
}

test.describe('Вид и узкий экран', () => {
  test('гость включает светлый вид, и он остаётся после перезагрузки', async ({ page }) => {
    test.skip(isNarrow(page), 'переключатель вида в левой колонке от 768px')
    await page.emulateMedia({ colorScheme: 'dark' })
    await page.goto('/')
    const navigation = leftNavigation(page)
    await navigation.getByRole('link', { name: 'Системная тема' }).click()
    await page.getByRole('menuitemradio', { name: 'Светлая' }).click()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
    await page.reload()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
    await expect(leftNavigation(page).getByRole('link', { name: 'Светлая тема' })).toBeVisible()
  })

  test('гость без выбора видит вид устройства и следует его смене', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' })
    await page.goto('/')
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
    await page.emulateMedia({ colorScheme: 'dark' })
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  })

  test('участник включает светлый вид из левой навигации', async ({ page }) => {
    test.skip(isNarrow(page), 'переключатель вида в левой колонке от 768px')
    await page.addInitScript(() => window.localStorage.setItem('mock_viewer', 'member'))
    await page.goto('/')
    await expect(page.getByRole('banner').getByRole('link', { name: 'Тёмная тема' })).toHaveCount(0)
    await leftNavigation(page).getByRole('link', { name: 'Тёмная тема' }).click()
    await page.getByRole('menuitemradio', { name: 'Светлая' }).click()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  })

  test('на узком экране нет боковой панели, снизу мобильная навигация', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'narrow-dark', 'нижняя панель только ниже 768px')
    for (const path of ['/', '/messages', '/discovery', '/popular', '/u/anna']) {
      await page.goto(path)
      await expect(page.getByRole('button', { name: 'Открыть навигацию' })).toHaveCount(0)
      await expect(leftNavigation(page)).toHaveCount(0)
      await expect(page.getByRole('navigation', { name: 'Мобильная навигация' })).toBeVisible()
    }
  })

  test('главная без серьёзных нарушений доступности', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('main').getByRole('article').first()).toBeVisible()
    const results = await new AxeBuilder({ page }).analyze()
    const serious = results.violations.filter((item) => item.impact === 'serious' || item.impact === 'critical')
    expect(serious).toEqual([])
  })
})
