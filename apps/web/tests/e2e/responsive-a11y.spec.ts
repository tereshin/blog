import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

async function openNavigation(page: Page) {
  if ((page.viewportSize()?.width ?? 0) < 768) {
    await page.getByRole('button', { name: 'Открыть навигацию' }).click()
  }
  return page.getByRole('navigation', { name: 'Навигация' })
}

test.describe('Вид и узкий экран', () => {
  test('гость включает светлый вид, и он остаётся после перезагрузки', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' })
    await page.goto('/')
    const navigation = await openNavigation(page)
    await navigation.getByRole('link', { name: 'Системная тема' }).click()
    await page.getByRole('menuitemradio', { name: 'Светлая' }).click()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
    await page.reload()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
    await expect((await openNavigation(page)).getByRole('link', { name: 'Светлая тема' })).toBeVisible()
  })

  test('гость без выбора видит вид устройства и следует его смене', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' })
    await page.goto('/')
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
    await page.emulateMedia({ colorScheme: 'dark' })
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  })

  test('участник включает светлый вид из левой навигации', async ({ page }) => {
    await page.addInitScript(() => window.localStorage.setItem('mock_viewer', 'member'))
    await page.goto('/')
    await expect(page.getByRole('banner').getByRole('link', { name: 'Тёмная тема' })).toHaveCount(0)
    await (await openNavigation(page)).getByRole('link', { name: 'Тёмная тема' }).click()
    await page.getByRole('menuitemradio', { name: 'Светлая' }).click()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  })

  test('на узком экране навигация открывается панелью, а «Написать» остаётся пером', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'narrow-dark', 'панель навигации только ниже 768px')
    await page.goto('/')
    const open = page.getByRole('button', { name: 'Открыть навигацию' })
    await expect(open).toBeVisible()
    await open.click()
    await expect(page.getByRole('navigation', { name: 'Навигация' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Написать' }).locator('span')).toHaveClass(/sr-only/)
  })

  test('бургер открывает одну панель на разных разделах, Escape её закрывает', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'narrow-dark', 'панель навигации только ниже 768px')
    for (const path of ['/', '/pages/welcome-page', '/messages', '/rating', '/u/anna']) {
      await page.goto(path)
      const open = page.getByRole('button', { name: 'Открыть навигацию' })
      await open.click()
      await expect(page.getByRole('navigation', { name: 'Навигация' })).toBeVisible()
      await page.keyboard.press('Escape')
      await expect(page.getByRole('navigation', { name: 'Навигация' })).toBeHidden()
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
