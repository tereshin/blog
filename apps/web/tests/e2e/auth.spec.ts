import { expect, test } from '@playwright/test'
import { readEmailCode } from './helpers/auth-mail.ts'

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

  test('новая почта проходит код и установку пароля без запроса имени', async ({ page }) => {
    test.skip(is_local, 'фиксированный код только в MSW')
    await page.goto('/')
    await page.getByRole('banner').getByRole('button', { name: 'Войти' }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog.getByLabel('Пароль', { exact: true })).toHaveCount(0)
    await dialog.getByLabel('Почта', { exact: true }).fill('signup@example.test')
    await dialog.getByRole('button', { name: 'Продолжить', exact: true }).click()
    await expect(dialog.getByRole('heading', { name: 'Код из письма' })).toBeVisible()
    await expect(dialog.getByRole('button', { name: 'Войти через Google' })).toHaveCount(0)
    await expect(dialog.getByRole('button', { name: /Отправить код ещё раз через/ })).toBeDisabled()
    await dialog.getByRole('textbox', { name: 'Код из письма' }).fill('000000')
    await expect(dialog.getByRole('alert')).toHaveText('Неверный код. Попробуйте ещё раз.')
    await dialog.getByRole('textbox', { name: 'Код из письма' }).fill('123456')
    await expect(dialog.getByRole('heading', { name: 'Создайте пароль' })).toBeVisible()
    await expect(dialog.getByLabel('Имя', { exact: true })).toHaveCount(0)
    await dialog.getByLabel('Пароль', { exact: true }).fill('password-ok')
    await dialog.getByRole('button', { name: 'Показать пароль' }).click()
    await expect(dialog.getByLabel('Пароль', { exact: true })).toHaveAttribute('type', 'text')
    await dialog.getByRole('button', { name: 'Сохранить и войти' }).click()
    await expect(dialog).toHaveCount(0)
    await expect(page.getByRole('banner').getByRole('button', { name: 'Меню учётной записи' })).toBeVisible()
    await expect(page).toHaveURL('/')
  })

  test('существующая почта показывает пароль, восстановление возвращает к входу по стрелке', async ({ page }) => {
    test.skip(is_local, 'известная почта фикстуры')
    await page.goto('/')
    await page.getByRole('banner').getByRole('button', { name: 'Войти' }).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByLabel('Почта', { exact: true }).fill('reader@blog.test')
    await dialog.getByRole('button', { name: 'Продолжить', exact: true }).click()
    await expect(dialog.getByRole('heading', { name: 'Вход', exact: true })).toBeVisible()
    await expect(dialog.getByLabel('Пароль', { exact: true })).toBeFocused()
    await expect(dialog.getByRole('button', { name: 'Войти', exact: true })).toBeVisible()
    await expect(dialog.getByRole('button', { name: 'Войти через Google' })).toHaveCount(0)
    await dialog.getByRole('button', { name: 'Отправить код на почту', exact: true }).click()
    await expect(dialog.getByRole('textbox', { name: 'Код из письма' })).toBeFocused()
    await dialog.getByRole('button', { name: 'Назад', exact: true }).click()
    await expect(dialog.getByLabel('Почта', { exact: true })).toHaveValue('reader@blog.test')
    await expect(dialog.getByLabel('Пароль', { exact: true })).toHaveValue('')
    await dialog.getByRole('button', { name: 'Назад', exact: true }).click()
    await expect(dialog.getByRole('button', { name: 'Продолжить', exact: true })).toBeVisible()
    await expect(dialog.getByRole('button', { name: 'Войти через Google' })).toBeVisible()
  })

  test('код восстановления ведёт к новому паролю и автоматическому входу', async ({ page }) => {
    test.skip(is_local, 'фиксированный код только в MSW')
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/')
    await page.getByRole('banner').getByRole('button', { name: 'Войти' }).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByLabel('Почта', { exact: true }).fill('reader@blog.test')
    await dialog.getByRole('button', { name: 'Продолжить', exact: true }).click()
    await dialog.getByRole('button', { name: 'Отправить код на почту', exact: true }).click()
    await dialog.getByRole('textbox', { name: 'Код из письма' }).evaluate((element) => {
      const data = new DataTransfer()
      data.setData('text', '123456')
      element.dispatchEvent(new ClipboardEvent('paste', { bubbles: true, clipboardData: data }))
    })
    await expect(dialog.getByRole('heading', { name: 'Новый пароль', exact: true })).toBeVisible()
    await dialog.getByLabel('Пароль', { exact: true }).fill('new-password-ok')
    await dialog.getByRole('button', { name: 'Сохранить и войти' }).click()
    await expect(dialog).toHaveCount(0)
    await expect(page.getByRole('banner').getByRole('button', { name: 'Меню учётной записи' })).toBeVisible()
  })

  test('закрытие очищает пароль и возвращает к первому шагу', async ({ page }) => {
    test.skip(is_local, 'известная почта фикстуры')
    await page.goto('/')
    await page.getByRole('banner').getByRole('button', { name: 'Войти' }).click()
    let dialog = page.getByRole('dialog')
    await dialog.getByLabel('Почта', { exact: true }).fill('reader@blog.test')
    await dialog.getByRole('button', { name: 'Продолжить', exact: true }).click()
    await dialog.getByLabel('Пароль', { exact: true }).fill('secret-password')
    await page.keyboard.press('Escape')
    await page.getByRole('banner').getByRole('button', { name: 'Войти' }).click()
    dialog = page.getByRole('dialog')
    await expect(dialog.getByLabel('Почта', { exact: true })).toHaveValue('')
    await expect(dialog.getByLabel('Пароль', { exact: true })).toHaveCount(0)
  })

  test('повторная отправка доступна через минуту, код редактируется Backspace', async ({ page }) => {
    test.skip(is_local, 'проверка часов MSW')
    await page.clock.install()
    await page.goto('/')
    await page.getByRole('banner').getByRole('button', { name: 'Войти' }).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByLabel('Почта', { exact: true }).fill('resend-ui@example.test')
    await dialog.getByRole('button', { name: 'Продолжить', exact: true }).click()
    const code = dialog.getByRole('textbox', { name: 'Код из письма' })
    await code.fill('123')
    await code.press('Backspace')
    await expect(code).toHaveValue('12')
    await page.clock.fastForward(60_001)
    const resend = dialog.getByRole('button', { name: 'Отправить код ещё раз', exact: true })
    await expect(resend).toBeEnabled()
    await resend.click()
    await expect(dialog.getByRole('button', { name: /Отправить код ещё раз через/ })).toBeDisabled()
    await expect(code).toHaveValue('')
  })

  test('ответ старого запроса не меняет повторно открытое окно', async ({ page }) => {
    test.skip(is_local, 'управляемый ответ MSW')
    await page.addInitScript(() => {
      const original = window.fetch
      window.fetch = (input, init) => {
        if (String(input).includes('/v1/auth/email-flows')) {
          return new Promise((resolve) => document.addEventListener('release-auth-request', () => {
            resolve(new Response(JSON.stringify({ step: 'password' }), { headers: { 'Content-Type': 'application/json' } }))
          }, { once: true }))
        }
        return original(input, init)
      }
    })
    await page.goto('/')
    await page.getByRole('banner').getByRole('button', { name: 'Войти' }).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByLabel('Почта', { exact: true }).fill('reader@blog.test')
    await dialog.getByRole('button', { name: 'Продолжить', exact: true }).click()
    await expect(dialog.getByRole('button', { name: 'Продолжить', exact: true })).toBeDisabled()
    await dialog.getByRole('button', { name: 'Закрыть', exact: true }).click()
    await expect(dialog).toHaveCount(0)
    await page.getByRole('banner').getByRole('button', { name: 'Войти' }).click()
    await page.evaluate(async () => {
      document.dispatchEvent(new Event('release-auth-request'))
      await new Promise((resolve) => window.setTimeout(resolve, 50))
    })
    await expect(dialog.getByRole('button', { name: 'Продолжить', exact: true })).toBeVisible()
    await expect(dialog.getByLabel('Почта', { exact: true })).toHaveValue('')
    await expect(dialog.getByLabel('Пароль', { exact: true })).toHaveCount(0)
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

  test('регистрация через Mailpit, выход и повторный вход через Firebase Emulator', async ({ page }) => {
    const email = `e2e-${Date.now()}@blog.test`
    const password = 'password-ok'
    await page.goto('/')
    await page.getByRole('banner').getByRole('button', { name: 'Войти' }).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByLabel('Почта', { exact: true }).fill(email)
    await dialog.getByRole('button', { name: 'Продолжить', exact: true }).click()
    const registration_code = await readEmailCode(page, email)
    await dialog.getByRole('textbox', { name: 'Код из письма' }).fill(registration_code)
    await dialog.getByLabel('Пароль', { exact: true }).fill(password)
    await dialog.getByRole('button', { name: 'Сохранить и войти' }).click()
    await expect(page.getByRole('banner').getByRole('button', { name: 'Меню учётной записи' })).toBeVisible()
    const storage_has_token = await page.evaluate(async () => {
      const bags = [JSON.stringify(localStorage), JSON.stringify(sessionStorage)]
      const databases = indexedDB.databases ? await indexedDB.databases() : []
      return bags.some((bag) => bag.includes('firebase')) || databases.some((db) => (db.name ?? '').toLowerCase().includes('firebase'))
    })
    expect(storage_has_token).toBe(false)
    await page.reload()
    await page.getByRole('banner').getByRole('button', { name: 'Меню учётной записи' }).click()
    await page.getByRole('menuitem', { name: 'Выйти' }).click()
    await page.getByRole('banner').getByRole('button', { name: 'Войти' }).click()
    await dialog.getByLabel('Почта', { exact: true }).fill(email)
    await dialog.getByRole('button', { name: 'Продолжить', exact: true }).click()
    await dialog.getByLabel('Пароль', { exact: true }).fill(password)
    await dialog.getByRole('button', { name: 'Войти', exact: true }).click()
    await expect(dialog).toHaveCount(0)
  })

  test('восстановление через Mailpit сохраняет новый пароль и автоматически входит', async ({ page }) => {
    const email = `reset-ui-${crypto.randomUUID()}@blog.test`
    const old_password = 'password-before-reset'
    const new_password = 'password-after-reset'
    await page.goto('/')
    const csrf = (await page.context().cookies('http://localhost:3000')).find((cookie) => cookie.name === 'blog_csrf')?.value ?? ''
    const registered = await page.request.post('http://localhost:3000/v1/auth/registrations', {
      data: { email, password: old_password }, headers: { 'X-CSRF-Token': csrf },
    })
    expect(registered.ok()).toBe(true)
    await page.getByRole('banner').getByRole('button', { name: 'Войти' }).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByLabel('Почта', { exact: true }).fill(email)
    await dialog.getByRole('button', { name: 'Продолжить', exact: true }).click()
    await dialog.getByRole('button', { name: 'Отправить код на почту', exact: true }).click()
    await dialog.getByRole('textbox', { name: 'Код из письма' }).fill(await readEmailCode(page, email))
    await expect(dialog.getByRole('heading', { name: 'Новый пароль', exact: true })).toBeVisible()
    await dialog.getByLabel('Пароль', { exact: true }).fill(new_password)
    await dialog.getByRole('button', { name: 'Сохранить и войти' }).click()
    await expect(dialog).toHaveCount(0)
    await page.getByRole('banner').getByRole('button', { name: 'Меню учётной записи' }).click()
    await page.getByRole('menuitem', { name: 'Выйти' }).click()
    await page.getByRole('banner').getByRole('button', { name: 'Войти' }).click()
    await dialog.getByLabel('Почта', { exact: true }).fill(email)
    await dialog.getByRole('button', { name: 'Продолжить', exact: true }).click()
    await dialog.getByLabel('Пароль', { exact: true }).fill(old_password)
    await dialog.getByRole('button', { name: 'Войти', exact: true }).click()
    await expect(dialog.getByRole('alert')).toHaveText('Неверная почта или пароль.')
    await dialog.getByLabel('Пароль', { exact: true }).fill(new_password)
    await dialog.getByRole('button', { name: 'Войти', exact: true }).click()
    await expect(dialog).toHaveCount(0)
  })

  test('панель показывает участников seed и входит одним жестом', async ({ page, request }) => {
    const config = await request.get('http://localhost:3000/v1/auth/config')
    expect(config.ok()).toBe(true)
    const body = (await config.json()) as { test_participants?: { label: string }[] }
    const label = body.test_participants?.[0]?.label
    expect(label).toBeTruthy()
    if (!label) throw new Error('Missing test participant')
    await page.goto('/')
    await page.getByRole('banner').getByRole('button', { name: 'Войти' }).click()
    await page.getByRole('button', { name: label }).click()
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
    if (!taken_email || !free_text) throw new Error('Missing email verification fixture')
    await page.getByLabel('Почта').fill(taken_email)
    await page.getByRole('button', { name: 'Указать почту' }).click()
    await expect(page.getByText(free_text)).toBeVisible()
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
    await page.goto('/pages/welcome-page')
    await page.getByRole('banner').getByRole('button', { name: 'Войти' }).click()
    const popup = page.waitForEvent('popup')
    await page.getByRole('button', { name: 'Войти через Google' }).click()
    const popup_page = await popup
    await popup_page.close()
    await expect(page.getByText('Вход не завершён.')).toBeVisible()
    await expect(page).toHaveURL(/\/pages\/welcome-page/)
    await expect(page.getByRole('banner').getByRole('button', { name: 'Войти' })).toBeVisible()
  })
})
