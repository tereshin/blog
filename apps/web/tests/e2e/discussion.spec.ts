import { expect, test } from '@playwright/test'
import type { BrowserContext, Page } from '@playwright/test'

const base_url = process.env['E2E_BASE_URL']
if (base_url) test.use({ baseURL: base_url })

async function asMember(context: BrowserContext): Promise<void> {
  await context.addInitScript(() => {
    if (!window.sessionStorage.getItem('mock_discussion_ready')) {
      window.localStorage.removeItem('mock_discussion_comments')
      window.sessionStorage.removeItem('mock_discussion_views')
      window.sessionStorage.setItem('mock_discussion_ready', '1')
    }
    const override = window.sessionStorage.getItem('mock_viewer_override')
    window.localStorage.setItem('mock_viewer', override || 'member')
  })
}

async function openArticle(page: Page, slug = 'statya-1'): Promise<void> {
  await page.goto(`/p/${slug}`)
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await expect(page.getByLabel('Написать комментарий')).toBeVisible()
}

test.describe('обсуждение на фикстурном gateway', () => {
  test('комментарий, ответ и заглушка после удаления', async ({ context, page }) => {
    await asMember(context)
    await openArticle(page)
    await page.getByLabel('Написать комментарий').fill('Корень обсуждения')
    await page.getByRole('button', { name: 'Отправить' }).click()
    const root = page.getByRole('article', { name: 'Роман Читаев' }).filter({ hasText: 'Корень обсуждения' })
    await expect(root).toBeVisible()

    await root.getByRole('button', { name: 'Ответить' }).first().click()
    const reply = page.getByRole('textbox', { name: /Ответ для/ })
    await reply.fill('Текст ответа, который нельзя потерять')
    await page.evaluate(() => {
      const events = (window as Window & { mockEvents?: { emit: (frame: { type: string; article_id: string }) => void } }).mockEvents
      events?.emit({ type: 'article', article_id: '9b2e3f40-2222-4b22-8b22-000000000001' })
    })
    await expect(reply).toHaveValue('Текст ответа, который нельзя потерять')
    await reply.locator('xpath=ancestor::form').getByRole('button', { name: 'Отправить' }).click()
    await expect(page.getByText('Текст ответа, который нельзя потерять')).toBeVisible()

    await root.getByRole('button', { name: 'Удалить' }).first().click()
    await page.getByRole('dialog').getByRole('button', { name: 'Удалить' }).click()
    await expect(page.getByText('Комментарий удалён')).toBeVisible()
    await expect(page.getByText('Текст ответа, который нельзя потерять')).toBeVisible()
  })

  test('другая вкладка видит комментарий без перезагрузки', async ({ context, page }) => {
    await asMember(context)
    await openArticle(page)
    const other = await context.newPage()
    await openArticle(other)
    await other.getByLabel('Написать комментарий').fill('Живой комментарий')
    await other.getByRole('button', { name: 'Отправить' }).click()
    await expect(page.getByText('Живой комментарий')).toBeVisible({ timeout: 2000 })
    await other.close()
  })

  test('повторное открытие не добавляет просмотр, заход автора не считается', async ({ context, page }) => {
    await asMember(context)
    const first = page.waitForResponse((response) => response.url().includes('/views') && response.request().method() === 'POST')
    await page.goto('/p/statya-1')
    expect((await (await first).json()) as { counted: boolean }).toMatchObject({ counted: true })
    const second = page.waitForResponse((response) => response.url().includes('/views') && response.request().method() === 'POST')
    await page.reload()
    expect((await (await second).json()) as { counted: boolean }).toMatchObject({ counted: false })

    await page.evaluate(() => window.sessionStorage.setItem('mock_viewer_override', 'author'))
    const author = page.waitForResponse((response) => response.url().includes('/views') && response.request().method() === 'POST')
    await page.goto('/p/statya-1')
    expect((await (await author).json()) as { counted: boolean }).toMatchObject({ counted: false })
  })
})

test.describe('обсуждение на локальном стеке', () => {
  test.skip(process.env['E2E_TARGET'] !== 'local', 'два сеанса и вход через mock-google проверяются на E2E_TARGET=local')

  test('двое обсуждают статью, просмотр считается по правилам', async ({ browser }) => {
    const anna = await browser.newContext()
    const boris = await browser.newContext()
    const author = await anna.newPage()
    const reader = await boris.newPage()
    await login(author, 'Анна Авторова')
    await login(reader, 'Борис Писарев')

    await reader.goto('/')
    const card = reader.getByRole('main').getByRole('article').filter({ hasText: 'Анна Авторова' }).first()
    await card.getByRole('heading', { level: 2 }).getByRole('link').click()
    await author.goto(reader.url())
    await reader.getByLabel('Написать комментарий').fill('Комментарий Бориса')
    await reader.getByRole('button', { name: 'Отправить' }).click()
    await expect(author.getByText('Комментарий Бориса')).toBeVisible({ timeout: 2000 })

    await author.getByRole('button', { name: 'Ответить' }).click()
    const reply = author.getByRole('textbox', { name: /Ответ для/ })
    await reply.fill('Черновик ответа')
    const title = await author.getByRole('heading', { level: 1 }).innerText()
    await reader.getByRole('button', { name: 'Редактировать' }).click()
    await expect(author.getByRole('heading', { level: 1 })).not.toHaveText(title, { timeout: 2000 }).catch(() => undefined)
    await expect(reply).toHaveValue('Черновик ответа')

    await anna.close()
    await boris.close()
  })
})

async function login(page: Page, name: string): Promise<void> {
  await page.goto('/')
  await page.getByRole('banner').getByRole('button', { name: 'Войти' }).click()
  await page.getByRole('button', { name: 'Войти через Google' }).click()
  await page.getByRole('button', { name }).click()
  await expect(page.getByRole('banner').getByRole('button', { name: 'Меню учётной записи' })).toBeVisible()
}
