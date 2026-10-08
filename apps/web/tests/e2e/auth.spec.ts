import { expect, test } from '@playwright/test'

test.describe('Вход и профиль', () => {
  test('гость видит «Войти», а Google открывает вход площадки', async ({ page }) => {
    await page.goto('/')
    await page.route('**/v1/auth/google**', (route) => route.abort())
    await page.getByRole('banner').getByRole('button', { name: 'Войти' }).click()
    const request = page.waitForRequest((item) => item.url().includes('/v1/auth/google'))
    await page.getByRole('button', { name: 'Войти через Google' }).click()
    expect((await request).url()).toContain('return_to=')
  })

  test('участник выходит и вторая вкладка тоже становится гостем', async ({ page }) => {
    await page.addInitScript(() => window.localStorage.setItem('mock_viewer', 'member'))
    await page.goto('/')
    const other = await page.context().newPage()
    await other.goto('/')
    await expect(other.getByRole('banner').getByRole('button', { name: 'Меню учётной записи' })).toBeVisible()

    await page.getByRole('banner').getByRole('button', { name: 'Меню учётной записи' }).click()
    await page.getByRole('menuitem', { name: 'Выйти' }).click()
    await expect(page.getByRole('banner').getByRole('button', { name: 'Войти' })).toBeVisible()
    await expect(other.getByRole('banner').getByRole('button', { name: 'Войти' })).toBeVisible()
    await other.close()
  })

  test('закрытая регистрация объясняется в диалоге', async ({ page }) => {
    await page.goto('/?auth_error=registration_closed')
    await expect(page.getByText('Регистрация закрыта. Новые участники пока не принимаются.')).toBeVisible()
  })

  test('занятый адрес не сохраняется, прежний остаётся', async ({ page }) => {
    await page.addInitScript(() => window.localStorage.setItem('mock_viewer', 'member'))
    await page.goto('/')
    await page.getByRole('banner').getByRole('button', { name: 'Меню учётной записи' }).click()
    await page.getByRole('menuitem', { name: 'Редактировать' }).click()
    await expect(page.getByText('Сейчас адрес: reader')).toBeVisible()
    await page.getByLabel('Короткий адрес').fill('taken')
    await page.getByRole('button', { name: 'Сохранить' }).click()
    await expect(page.getByText('Этот адрес уже занят')).toBeVisible()
    await expect(page.getByText('Сейчас адрес: reader')).toBeVisible()
  })
})
