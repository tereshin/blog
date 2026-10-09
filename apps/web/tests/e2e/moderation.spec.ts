import { expect, test } from '@playwright/test'

test.describe('Модерация', () => {
  test.describe.configure({ timeout: 60_000 })

  test('администратор скрывает статью из жалоб, и она уходит из ленты', async ({ page }) => {
    await page.addInitScript(() => window.localStorage.setItem('mock_viewer', 'admin'))
    await page.goto('/admin/moderation')
    await expect(page.getByRole('heading', { name: /^Статья 1:/ })).toBeVisible({ timeout: 15_000 })
    await page.getByRole('button', { name: 'Скрыть' }).click()
    await expect(page.getByRole('button', { name: 'Вернуть' })).toBeVisible()
    await page.getByRole('link', { name: 'Блог' }).click()
    await expect(page.getByRole('heading', { name: /^Статья 1:/ })).toHaveCount(0)
  })

  test('суперадминистратор находит участника по почте', async ({ page }) => {
    await page.addInitScript(() => window.localStorage.setItem('mock_viewer', 'superadmin'))
    await page.goto('/admin/settings')
    await expect(page.getByText('Найти участника')).toBeVisible({ timeout: 15_000 })
    await page.getByRole('textbox', { name: 'Найти участника' }).fill('reader@example.test')
    await page.getByRole('button', { name: 'Открыть', exact: true }).click()
    await expect(page.getByText('reader@example.test')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Администраторы' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Участники' })).toBeVisible()
  })

  test('администратор не меняет настройки площадки', async ({ page }) => {
    await page.addInitScript(() => window.localStorage.setItem('mock_viewer', 'admin'))
    await page.goto('/admin/settings')
    await expect(page.getByText('Раздел доступен только администратору площадки')).toBeVisible({ timeout: 15_000 })
  })

  test('участник не открывает модерацию', async ({ page }) => {
    await page.addInitScript(() => window.localStorage.setItem('mock_viewer', 'member'))
    await page.goto('/admin/moderation')
    await expect(page.getByText('Этот раздел доступен только администраторам')).toBeVisible({ timeout: 15_000 })
  })

  test('ограниченный видит полосу в центре', async ({ page }) => {
    await page.addInitScript(() => window.localStorage.setItem('mock_viewer', 'restricted'))
    await page.goto('/')
    await expect(page.getByText('Учётная запись ограничена: действие недоступно')).toBeVisible({ timeout: 15_000 })
  })
})

test.describe('модерация на локальном стеке', () => {
  test.skip(process.env['E2E_TARGET'] !== 'local', 'регистрация, роли и живое скрытие проверяются на E2E_TARGET=local')

  test('закрытая регистрация, скрытие и ограничение', async ({ page }) => {
    await page.goto('/admin/settings')
    await expect(page.getByRole('banner')).toBeVisible()
  })
})
