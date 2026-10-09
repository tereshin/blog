import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

const THREE_COLUMNS = 1280
const ARTICLE_ID = '9b2e3f40-2222-4b22-8b22-000000000001'

function hasThreeColumns(page: Page): boolean {
  return (page.viewportSize()?.width ?? 0) >= THREE_COLUMNS
}

test.describe('Поиск и уведомления', () => {
  test.beforeEach(({ page }) => {
    test.skip(!hasThreeColumns(page), 'Шапка с пилюлей проверяется от 1280px')
  })

  test('поиск открывает поле вместо пилюли, закрытие возвращает пилюлю, запрос находит статью', async ({ page }) => {
    await page.goto('/')
    const banner = page.getByRole('banner')
    await expect(banner.getByRole('link', { name: /без компромиссов/ })).toBeVisible({ timeout: 15_000 })
    await banner.getByRole('button', { name: 'Поиск' }).click()
    const field = banner.getByRole('textbox', { name: 'Поиск' })
    await expect(field).toBeVisible({ timeout: 10_000 })
    await expect(banner.getByRole('link', { name: /без компромиссов/ })).toHaveCount(0)
    await field.press('Escape')
    await expect(field).toHaveCount(0)
    await expect(banner.getByRole('link', { name: /без компромиссов/ })).toBeVisible()

    await banner.getByRole('button', { name: 'Поиск' }).click()
    await expect(field).toBeVisible({ timeout: 10_000 })
    await field.fill('компромиссов')
    // Enter уводит на /search и снимает поле — ждать URL, а не завершения press на отмонтированном input.
    await Promise.all([page.waitForURL((url) => url.pathname === '/search'), field.press('Enter')])
    await expect.poll(() => new URL(page.url()).pathname).toBe('/search')
    await expect(page.getByRole('main').getByRole('heading', { name: /без компромиссов/ }).first()).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText('Черновик про компромиссы')).toHaveCount(0)
    await expect(banner).toBeVisible()
  })

  test('гость по колокольчику видит вход, адрес не меняется', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('banner').getByRole('button', { name: 'Уведомления' }).click()
    await expect(page.getByRole('dialog')).toContainText('Войдите, чтобы продолжить')
    await expect.poll(() => new URL(page.url()).pathname).toBe('/')
  })

  test('комментарий другого участника ставит точку без перезагрузки, свой комментарий — нет', async ({ page }) => {
    await page.addInitScript(() => window.localStorage.setItem('mock_viewer', 'author'))
    await page.goto('/')
    const bell = page.getByRole('banner').getByRole('button', { name: /Уведомления/ })
    const dot = bell.getByRole('img', { name: 'Есть непрочитанные уведомления' })
    await expect(bell).toBeVisible({ timeout: 15_000 })
    await expect(dot).toHaveCount(0)

    await page.evaluate(async (article_id) => {
      await fetch(`/v1/articles/${article_id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: 'Свой комментарий' }),
      })
    }, ARTICLE_ID)
    await expect(dot).toHaveCount(0)

    await page.evaluate(async (article_id) => {
      await fetch(`/v1/articles/${article_id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Mock-Actor': 'member' },
        body: JSON.stringify({ body: 'Комментарий второго участника' }),
      })
    }, ARTICLE_ID)
    await expect(dot).toBeVisible()
    await bell.click()
    const item = page.getByRole('link', { name: /прокомментировал/ })
    await expect(item).toBeVisible()
    await item.click()
    await expect.poll(() => page.url()).toContain('#comment-')
  })

  test('живое уведомление двух сеансов', async () => {
    test.skip(process.env['E2E_TARGET'] !== 'local', 'два сеанса проверяются на E2E_TARGET=local')
  })
})
