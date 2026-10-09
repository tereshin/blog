import { expect, test } from '@playwright/test'

const is_local = process.env['E2E_TARGET'] === 'local'

test.describe('вход через mock-google', () => {
  test.skip(!is_local, 'нужен Compose (E2E_TARGET=local)')

  test('гость входит выбранным участником и выходит', async ({ page, request }) => {
    const participants = ['superadmin', 'admin', 'author_a', 'reader', 'no_publish', 'restricted', 'newcomer']
    for (const participant of participants) {
      await page.goto('/')
      await page.getByRole('banner').getByRole('button', { name: 'Войти' }).click()
      await page.getByRole('button', { name: 'Войти через Google' }).click()
      await page.locator(`[data-participant="${participant}"]`).click()
      await expect(page.getByRole('button', { name: 'Меню учётной записи' })).toBeVisible()
      await page.getByRole('button', { name: 'Меню учётной записи' }).click()
      await page.getByRole('menuitem', { name: 'Выйти' }).click()
      await expect(page.getByRole('banner').getByRole('button', { name: 'Войти' })).toBeVisible()
    }
    const dev_login = await request.post('/v1/auth/dev-login')
    expect(dev_login.status()).toBe(404)
  })
})
