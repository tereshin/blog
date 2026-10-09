import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

test.describe('Вид и узкий экран', () => {
  test('гость включает светлый вид, и он остаётся после перезагрузки', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Светлый вид' }).click()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
    await page.reload()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
    await expect(page.getByRole('button', { name: 'Тёмный вид' })).toBeVisible()
  })

  test('участник включает светлый вид из меню учётной записи', async ({ page }) => {
    await page.addInitScript(() => window.localStorage.setItem('mock_viewer', 'member'))
    await page.goto('/')
    await page.getByRole('button', { name: 'Меню учётной записи' }).click()
    await page.getByRole('menuitem', { name: 'Светлый вид' }).click()
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
    for (const path of ['/', '/about', '/messages', '/rating', '/p/statya-1', '/u/anna']) {
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
    await expect(page.getByRole('button', { name: 'Светлый вид' })).toBeVisible()
    const results = await new AxeBuilder({ page }).analyze()
    const serious = results.violations.filter((item) => item.impact === 'serious' || item.impact === 'critical')
    expect(serious).toEqual([])
  })
})
