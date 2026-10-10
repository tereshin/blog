import { expect, test } from '@playwright/test'

const is_local = process.env['E2E_TARGET'] === 'local'

test.describe('Вход и профиль', () => {
  test('гость открывает панель с почтой и не уходит на /v1/auth/google', async ({ page }) => {
    await page.goto('/')
    let google_hit = false
    page.on('request', (request) => {
      if (request.url().includes('/v1/auth/google')) google_hit = true
    })
    await page.getByRole('banner').getByRole('button', { name: 'Войти' }).click()
    await expect(page.getByLabel('Почта')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Войти через Google' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Войти через GitHub' })).toBeVisible()
    expect(google_hit).toBe(false)
    expect(page.url()).not.toContain('/v1/auth/google')
  })

  test('регистрация передаёт имя, а сброс пароля скрывает лишние поля', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('banner').getByRole('button', { name: 'Войти' }).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByRole('button', { name: 'Зарегистрироваться', exact: true }).click()
    await dialog.getByLabel('Имя', { exact: true }).fill('Анна')
    await dialog.getByLabel('Почта', { exact: true }).fill('anna@example.com')
    await dialog.getByLabel('Пароль', { exact: true }).fill('password-ok')
    await page.route('**/v1/auth/registrations', async (route) => {
      expect(route.request().postDataJSON()).toEqual({ email: 'anna@example.com', password: 'password-ok', display_name: 'Анна' })
      await route.fulfill({ json: { status: 'pending' } })
    })
    await dialog.getByRole('button', { name: 'Создать учётную запись' }).click()
    await expect(dialog.getByText(/Если адрес можно использовать/)).toBeVisible()
    await dialog.getByRole('button', { name: 'Войти', exact: true }).click()
    await dialog.getByRole('button', { name: 'Забыли пароль?' }).click()
    await expect(dialog.getByLabel('Почта', { exact: true })).toBeVisible()
    await expect(dialog.getByLabel('Пароль', { exact: true })).toHaveCount(0)
    await expect(dialog.getByLabel('Имя', { exact: true })).toHaveCount(0)
    await expect(dialog.getByRole('button', { name: 'Войти через Google' })).toBeVisible()
  })

  test('участник выходит и вторая вкладка тоже становится гостем', async ({ page }) => {
    test.skip(is_local, 'мок viewer только на фикстурном gateway')
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
    test.skip(is_local, 'мок viewer только на фикстурном gateway')
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

test.describe('вход через эмулятор', () => {
  test.skip(!is_local, 'нужен Compose (E2E_TARGET=local)')

  test('регистрация почтой, выход и повторный вход в тот же профиль', async ({ page }) => {
    const email = `e2e-${Date.now()}@blog.test`
    const password = 'password-ok'
    await page.goto('/')
    await page.getByRole('banner').getByRole('button', { name: 'Войти' }).click()
    await page.getByLabel('Почта').fill(email)
    await page.getByLabel('Пароль').fill(password)
    await page.getByRole('button', { name: 'Зарегистрироваться' }).click()
    await page.getByLabel('Имя', { exact: true }).fill('Тестовый участник')
    await page.getByRole('button', { name: 'Создать учётную запись' }).click()
    await expect(page.getByText('Если адрес можно использовать, мы отправили письмо.')).toBeVisible()

    await page.getByRole('button', { name: 'Войти', exact: true }).click()
    await page.getByLabel('Почта').fill(email)
    await page.getByLabel('Пароль').fill(password)
    await page.getByRole('button', { name: 'Войти', exact: true }).click()
    await expect(page.getByRole('banner').getByRole('button', { name: 'Меню учётной записи' })).toBeVisible()
    const storage_has_token = await page.evaluate(async () => {
      const bags = [JSON.stringify(localStorage), JSON.stringify(sessionStorage)]
      const databases = indexedDB.databases ? await indexedDB.databases() : []
      return bags.some((bag) => bag.includes('firebase')) || databases.some((db) => (db.name ?? '').toLowerCase().includes('firebase'))
    })
    expect(storage_has_token).toBe(false)

    await page.reload()
    await expect(page.getByRole('banner').getByRole('button', { name: 'Меню учётной записи' })).toBeVisible()

    await page.getByRole('banner').getByRole('button', { name: 'Меню учётной записи' }).click()
    await page.getByRole('menuitem', { name: 'Выйти' }).click()
    await page.getByRole('banner').getByRole('button', { name: 'Войти' }).click()
    await page.getByLabel('Почта').fill(email)
    await page.getByLabel('Пароль').fill(password)
    await page.getByRole('button', { name: 'Войти', exact: true }).click()
    await expect(page.getByRole('banner').getByRole('button', { name: 'Меню учётной записи' })).toBeVisible()
  })

  test('панель показывает участников seed и входит одним жестом', async ({ page, request }) => {
    const config = await request.get('http://localhost:3000/v1/auth/config')
    expect(config.ok()).toBe(true)
    const body = (await config.json()) as { test_participants?: { label: string }[] }
    const label = body.test_participants?.[0]?.label
    expect(label).toBeTruthy()
    await page.goto('/')
    await page.getByRole('banner').getByRole('button', { name: 'Войти' }).click()
    await page.getByRole('button', { name: label! }).click()
    await expect(page.getByRole('banner').getByRole('button', { name: 'Меню учётной записи' })).toBeVisible()
    const dev_login = await request.post('http://localhost:3000/v1/auth/dev-login')
    expect(dev_login.status()).toBe(404)
  })

  test('неподтверждённая почта: занятый адрес выглядит как свободный, после кода можно комментировать', async ({ page }) => {
    const signup = await page.request.post('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo', {
      data: { email: `hidden-${Date.now()}@blog.test`, password: 'password-ok', returnSecureToken: true },
    })
    expect(signup.ok()).toBe(true)
    const { idToken } = (await signup.json()) as { idToken: string }
    const session = await page.request.post('http://localhost:3000/v1/auth/sessions', {
      data: { method: 'id_token', id_token: idToken },
      headers: { 'x-idempotency-key': `e2e-${Date.now()}` },
    })
    expect(session.status()).toBe(204)

    await page.goto('/')
    await expect(page.getByLabel('Почта')).toBeVisible()
    await page.getByLabel('Почта').fill('taken-hidden@blog.test')
    await page.getByRole('button', { name: 'Указать почту' }).click()
    const free_text = await page.getByText('Если адрес можно использовать, мы отправили письмо.').textContent()

    await page.getByRole('button', { name: 'Войти', exact: true }).click()
    const config = await page.request.get('http://localhost:3000/v1/auth/config')
    const participants = (await config.json()) as { test_participants?: { email: string }[] }
    const taken_email = participants.test_participants?.[0]?.email
    expect(taken_email).toBeTruthy()
    await page.getByLabel('Почта').fill(taken_email!)
    await page.getByRole('button', { name: 'Указать почту' }).click()
    await expect(page.getByText(free_text!)).toBeVisible()
    await expect(page.getByText('занят')).toHaveCount(0)

    await page.keyboard.press('Escape')
    await page.getByRole('link', { name: /.+/ }).first().click()
    const comment = page.getByLabel('Написать комментарий')
    if (await comment.count()) {
      await comment.fill('Текст остаётся')
      await expect(page.getByText('Подтвердите почту')).toBeVisible()
      await expect(comment).toHaveValue('Текст остаётся')
    }

    const codes = await page.request.get('http://127.0.0.1:9099/emulator/v1/projects/demo-blog/oobCodes')
    const list = (await codes.json()) as { oobCodes?: { oobCode: string; requestType: string }[] }
    const code = list.oobCodes?.find((item) => item.requestType === 'VERIFY_EMAIL')?.oobCode
    expect(code).toBeTruthy()
    await page.goto(`/auth/action?mode=verifyEmail&oob_code=${code}`)
    await expect(page.getByText('Почта подтверждена.')).toBeVisible()
    await expect(page).not.toHaveURL(/oob_code/)
  })

  test('закрытие окна провайдера оставляет гостя на том же адресе', async ({ page }) => {
    await page.goto('/about')
    await page.getByRole('banner').getByRole('button', { name: 'Войти' }).click()
    const popup = page.waitForEvent('popup')
    await page.getByRole('button', { name: 'Войти через Google' }).click()
    const popup_page = await popup
    await popup_page.close()
    await expect(page.getByText('Вход не завершён.')).toBeVisible()
    await expect(page).toHaveURL(/\/about/)
    await expect(page.getByRole('banner').getByRole('button', { name: 'Войти' })).toBeVisible()
  })
})
