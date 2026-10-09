import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

const ANNA = 'a1000000-0000-4000-8000-000000000001'
const ROMAN = '0b3a4c50-3333-4c33-8c33-000000000005'
const LEFT_COLUMN = 768

function hasLeftColumn(page: Page): boolean {
  return (page.viewportSize()?.width ?? 0) >= LEFT_COLUMN
}

test.describe('Сообщения', () => {
  test.describe.configure({ timeout: 60_000 })
  test('гость видит просьбу войти и не запрашивает диалоги', async ({ page }) => {
    const requested: string[] = []
    page.on('request', (request) => {
      if (request.url().includes('/v1/conversations')) requested.push(request.url())
    })
    await page.goto('/messages')
    await expect(page.getByText('Войдите, чтобы читать сообщения')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByRole('banner')).toBeVisible()
    expect(requested).toEqual([])
  })

  test('участник отправляет сообщение и видит его в диалоге', async ({ page }) => {
    await page.addInitScript(() => window.localStorage.setItem('mock_viewer', 'author'))
    await page.goto('/messages')
    await page.getByRole('button', { name: 'Новое сообщение' }).click()
    await page.getByRole('textbox', { name: 'Найти человека' }).fill('Роман')
    await page.getByRole('button', { name: 'Роман Читаев' }).click()
    await page.getByRole('textbox', { name: 'Сообщение' }).fill('Привет, Роман')
    await page.getByRole('button', { name: 'Отправить' }).click()
    await expect(page.getByRole('region', { name: 'Роман Читаев' }).getByText('Привет, Роман')).toBeVisible()
    await expect(page.getByRole('banner')).toBeVisible()
  })

  test('ограниченный видит объяснение вместо поля', async ({ page }) => {
    await page.addInitScript(() => window.localStorage.setItem('mock_viewer', 'restricted'))
    await page.goto(`/messages/new?to=${ANNA}`)
    await expect(page.getByText('Ваша учётная запись ограничена: писать сообщения нельзя')).toBeVisible({ timeout: 30_000 })
    await expect(page.getByRole('textbox', { name: 'Сообщение' })).toHaveCount(0)
  })

  test('признак у «Сообщений» исчезает после открытия диалога', async ({ page }) => {
    test.skip(!hasLeftColumn(page), 'Левый столбец виден от 768px')
    await page.addInitScript(() => window.localStorage.setItem('mock_viewer', 'member'))
    await page.goto('/')
    await expect(page.getByRole('link', { name: 'Сообщения' })).toBeVisible()
    await page.evaluate(async (peer_id) => {
      await fetch(`/v1/conversations/with/${peer_id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Mock-Actor': 'author' },
        body: JSON.stringify({ body: 'Есть новое письмо' }),
      })
      // mockEvents ставит фикстурный gateway на window; в типах страницы его нет.
      const events = (window as Window & { mockEvents?: { emit: (frame: object) => void } }).mockEvents
      events?.emit({ type: 'message', occurred_at: new Date().toISOString() })
    }, ROMAN)
    const messages = page.getByRole('link', { name: 'Сообщения' })
    await expect(messages.getByRole('img', { name: 'Есть непрочитанные' })).toBeVisible()
    await messages.click()
    const list = page.getByRole('region', { name: 'Сообщения' })
    await list.getByRole('link', { name: /Анна Авторова/ }).click()
    await expect(page.getByRole('region', { name: 'Анна Авторова' }).getByText('Есть новое письмо')).toBeVisible()
    await expect(messages.getByRole('img', { name: 'Есть непрочитанные' })).toHaveCount(0)
  })
})

test.describe('сообщения на локальном стеке', () => {
  test.skip(process.env['E2E_TARGET'] !== 'local', 'два сеанса и вход через mock-google проверяются на E2E_TARGET=local')

  test('двое переписываются без перезагрузки, признак исчезает, гость и ограниченный видят объяснение', async ({ browser }) => {
    const anna_context = await browser.newContext()
    const roman_context = await browser.newContext()
    const rita_context = await browser.newContext()
    const guest_context = await browser.newContext()
    const anna = await anna_context.newPage()
    const roman = await roman_context.newPage()
    const rita = await rita_context.newPage()
    const guest = await guest_context.newPage()

    await login(anna, 'Анна Авторова')
    await login(roman, 'Роман Читаев')
    await login(rita, 'Рита Ограничева')

    await roman.goto('/messages')
    await anna.goto('/messages')
    await anna.getByRole('button', { name: 'Новое сообщение' }).click()
    await anna.getByRole('textbox', { name: 'Найти человека' }).fill('Роман')
    await anna.getByRole('button', { name: 'Роман Читаев' }).click()
    await anna.getByRole('textbox', { name: 'Сообщение' }).fill('Живое приветствие')
    await anna.getByRole('button', { name: 'Отправить' }).click()
    await roman.getByRole('region', { name: 'Сообщения' }).getByRole('link', { name: /Анна Авторова/ }).click()
    await expect(roman.getByRole('region', { name: 'Анна Авторова' }).getByText('Живое приветствие')).toBeVisible({ timeout: 5000 })

    await anna.getByRole('textbox', { name: 'Сообщение' }).fill('Второе без перезагрузки')
    await anna.getByRole('button', { name: 'Отправить' }).click()
    await expect(roman.getByRole('region', { name: 'Анна Авторова' }).getByText('Второе без перезагрузки')).toBeVisible({ timeout: 5000 })

    await roman.goto('/')
    await anna.getByRole('textbox', { name: 'Сообщение' }).fill('Третье для признака')
    await anna.getByRole('button', { name: 'Отправить' }).click()
    const messages = roman.getByRole('link', { name: 'Сообщения' })
    await expect(messages.getByRole('img', { name: 'Есть непрочитанные' })).toBeVisible({ timeout: 5000 })
    await messages.click()
    await roman.getByRole('region', { name: 'Сообщения' }).getByRole('link', { name: /Анна Авторова/ }).click()
    await expect(messages.getByRole('img', { name: 'Есть непрочитанные' })).toHaveCount(0)

    await guest.goto('/messages')
    await expect(guest.getByText('Войдите, чтобы читать сообщения')).toBeVisible()

    await rita.goto('/messages')
    await rita.getByRole('button', { name: 'Новое сообщение' }).click()
    await rita.getByRole('textbox', { name: 'Найти человека' }).fill('Анна')
    await rita.getByRole('button', { name: 'Анна Авторова' }).click()
    await expect(rita.getByText('Ваша учётная запись ограничена: писать сообщения нельзя')).toBeVisible()

    await Promise.all([anna_context.close(), roman_context.close(), rita_context.close(), guest_context.close()])
  })
})

async function login(page: Page, name: string): Promise<void> {
  await page.goto('/')
  await page.getByRole('banner').getByRole('button', { name: 'Войти' }).click()
  await page.getByRole('button', { name: 'Войти через Google' }).click()
  await page.getByRole('button', { name }).click()
  await expect(page.getByRole('banner').getByRole('button', { name: 'Меню учётной записи' })).toBeVisible()
}
