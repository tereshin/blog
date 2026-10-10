import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

const ARTICLE_ID = '9b2e3f40-2222-4b22-8b22-000000000001'
const ROOT_ID = '7a1c2d30-1111-4a11-8a11-000000000020'
const REPLY_ID = '7a1c2d30-1111-4a11-8a11-000000000021'

async function seedDiscussion(page: Page, viewer = 'member'): Promise<void> {
  await page.addInitScript(
    ({ article_id, root_id, reply_id, viewer }) => {
      window.localStorage.setItem('mock_viewer', viewer)
      const comment = (
        id: string,
        parent_id: string | null,
        body: string,
        day: number,
        hearts: number,
      ) => ({
        id,
        article_id,
        parent_id,
        body,
        status: 'visible',
        edited_at: null,
        author: {
          user_id: 'a1000000-0000-4000-8000-000000000002',
          display_name: 'Борис Писарев',
          avatar_url: null,
        },
        reaction_counts: { laugh: 0, heart: hearts, thumb: 0, fire: 0 },
        reactions: hearts ? { '0b3a4c50-3333-4c33-8c33-000000000005': 'heart' } : {},
        created_at: `2026-10-0${day}T12:00:00.000Z`,
      })
      window.localStorage.setItem(
        'mock_discussion_comments',
        JSON.stringify([
          comment(root_id, null, 'Самый популярный комментарий', 2, 5),
          comment(reply_id, root_id, 'Первый ответ в ветке', 3, 1),
          comment('7a1c2d30-1111-4a11-8a11-000000000022', root_id, 'Второй ответ в ветке', 4, 3),
          comment('7a1c2d30-1111-4a11-8a11-000000000023', null, 'Новый корневой комментарий', 5, 1),
        ]),
      )
    },
    { article_id: ARTICLE_ID, root_id: ROOT_ID, reply_id: REPLY_ID, viewer },
  )
}

const discussion = (page: Page) => page.locator('#comments')
const root = (page: Page) => page.locator(`#comment-${ROOT_ID}`)

test('ветки свёрнуты, раскрываются и сортируются независимо', async ({ page }) => {
  await seedDiscussion(page)
  await page.goto('/p/statya-1')
  await expect(root(page)).toBeVisible()
  await expect(page.getByText('Первый ответ в ветке')).toHaveCount(0)
  await root(page).getByRole('button', { name: '2 ответа', exact: true }).click()
  await expect(page.getByText('Первый ответ в ветке')).toBeVisible()
  await root(page).getByRole('button', { name: 'Сортировка комментариев' }).click()
  await page.getByRole('menu').getByText('Сначала новые', { exact: true }).click()
  await expect(root(page).locator('article').first()).toContainText('Второй ответ в ветке')
  await root(page).getByRole('button', { name: 'Скрыть ответы' }).click()
  await expect(page.getByText('Первый ответ в ветке')).toHaveCount(0)
  await discussion(page).getByRole('button', { name: 'Сортировка комментариев' }).click()
  await page.getByRole('menu').getByText('Сначала новые', { exact: true }).click()
  await expect(discussion(page).locator('article').first()).toContainText(
    'Новый корневой комментарий',
  )
  await discussion(page).getByRole('button', { name: 'Сортировка комментариев' }).click()
  await page.getByRole('menu').getByText('Лучшие', { exact: true }).click()
  await expect(discussion(page).locator('article').first()).toContainText(
    'Самый популярный комментарий',
  )
})

test('прямая ссылка раскрывает ответ; меню показывает участников, поставивших реакции', async ({
  page,
}) => {
  await seedDiscussion(page)
  await page.goto(`/p/statya-1#comment-${REPLY_ID}`)
  await expect(page.getByText('Первый ответ в ветке')).toBeVisible()
  await root(page).getByRole('button', { name: 'Меню комментария' }).first().click()
  await expect(page.getByRole('menuitem', { name: 'В закладки', exact: true })).toBeEnabled()
  await expect(page.getByRole('menuitem', { name: 'Пожаловаться', exact: true })).toBeEnabled()
  await page.getByRole('menuitem', { name: 'Посмотреть реакции' }).click()
  const reactions = page.getByRole('dialog', { name: 'Посмотреть реакции' })
  await expect(reactions).toContainText('Сердце')
  await expect(reactions).toContainText('5')
  await expect(reactions).toContainText('Роман Читаев')
  await page.keyboard.press('Escape')
  await expect(reactions).toHaveCount(0)
  await expect(root(page).getByRole('button', { name: 'Меню комментария' }).first()).toBeFocused()
})

test('компактное поле раскрывается, вставляет эмодзи и отправляет с клавиатуры', async ({
  page,
}) => {
  await seedDiscussion(page)
  await page.goto('/p/statya-1')
  const field = page.getByLabel('Написать комментарий')
  await expect(field).toBeVisible()
  await expect(
    discussion(page).getByRole('button', { name: 'Отправить', exact: true }),
  ).toHaveCount(0)
  await field.fill('Новый текст')
  await expect(
    discussion(page).getByRole('button', { name: 'Отправить', exact: true }),
  ).toBeEnabled()
  await discussion(page).getByRole('button', { name: 'Добавить эмодзи' }).click()
  await page.getByRole('menuitem', { name: '🔥', exact: true }).click()
  await expect(field).toHaveValue('Новый текст🔥')
  await field.press('Control+Enter')
  await expect(page.getByText('Новый текст🔥', { exact: true })).toBeVisible()
  await expect(field).toHaveValue('')
})

test('ответ открывает ветку; обсуждение доступно и помещается на экране', async ({
  page,
}, testInfo) => {
  await seedDiscussion(page)
  await page.goto('/p/statya-1')
  await root(page).getByRole('button', { name: 'Ответить', exact: true }).first().click()
  const field = page.getByRole('textbox', { name: /Ответ для/ })
  await field.fill('Ответ из новой формы')
  await field
    .locator('xpath=ancestor::form')
    .getByRole('button', { name: 'Отправить', exact: true })
    .click()
  await expect(page.getByText('Ответ из новой формы', { exact: true })).toBeVisible()
  const result = await new AxeBuilder({ page }).include('#comments').analyze()
  expect(
    result.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical'),
  ).toEqual([])
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  )
  await discussion(page).screenshot({ path: testInfo.outputPath('discussion.png') })
})

test('закладки комментариев, жалоба и подписка сохраняются через API', async ({ page }) => {
  await seedDiscussion(page)
  await page.goto('/p/statya-1')
  await root(page).getByRole('button', { name: 'Меню комментария' }).click()
  await page.getByRole('menuitem', { name: 'В закладки', exact: true }).click()
  await root(page).getByRole('button', { name: 'Меню комментария' }).click()
  await expect(
    page.getByRole('menuitem', { name: 'Убрать из закладок', exact: true }),
  ).toBeVisible()
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: 'Следить за обсуждением', exact: true }).click()
  await expect(
    page.getByRole('button', { name: 'Не следить за обсуждением', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true')
  await root(page).getByRole('button', { name: 'Меню комментария' }).click()
  await page.getByRole('menuitem', { name: 'Пожаловаться', exact: true }).click()
  const report = page.getByRole('dialog', { name: 'Пожаловаться' })
  await report.getByLabel('Причина жалобы').fill('Спам в комментарии')
  await report.getByRole('button', { name: 'Отправить жалобу' }).click()
  await expect(report).toHaveCount(0)
  await expect
    .poll(() =>
      page.evaluate(() => JSON.parse(localStorage.getItem('mock_comment_reports') ?? '[]').length),
    )
    .toBe(1)
  // Navigate inside the app: init scripts run only for a new document.
  await page.getByRole('button', { name: 'Меню учётной записи' }).click()
  await page.getByRole('menuitem', { name: 'Закладки', exact: true }).click()
  await page.getByRole('tab', { name: 'Комментарии', exact: true }).click()
  await expect(page.getByText('Самый популярный комментарий')).toBeVisible()
})

test('изображение, GIF и упоминание отправляются вместе с текстом', async ({ page }) => {
  await seedDiscussion(page)
  await page.goto('/p/statya-1')
  const form = discussion(page).locator('form').first()
  await form.getByLabel('Написать комментарий').fill('С вложением и упоминанием')
  await form
    .locator('input[type=file]')
    .first()
    .setInputFiles({
      name: 'pixel.png',
      mimeType: 'image/png',
      buffer: Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
        'base64',
      ),
    })
  await expect(form.getByRole('button', { name: 'Убрать изображение' })).toBeVisible()
  await form
    .locator('input[type=file]')
    .nth(1)
    .setInputFiles({
      name: 'pixel.gif',
      mimeType: 'image/gif',
      buffer: Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64'),
    })
  await expect(form.getByRole('button', { name: 'Убрать изображение' })).toHaveCount(2)
  await form.getByRole('button', { name: 'Упомянуть участника' }).click()
  const mention = page.getByRole('dialog', { name: 'Упомянуть участника' })
  await mention.getByLabel('Имя участника').fill('Анна')
  await mention.getByRole('button', { name: 'Анна Авторова' }).click()
  await expect(form.getByRole('button', { name: 'Убрать упоминание Анна Авторова' })).toBeVisible()
  await form.getByRole('button', { name: 'Отправить', exact: true }).click()
  const sent = discussion(page).locator('article').filter({ hasText: 'С вложением и упоминанием' })
  await expect(sent.locator('img')).toHaveCount(2)
  await expect(sent.getByText('@Анна Авторова')).toBeVisible()
  await expect(form.getByLabel('Написать комментарий')).toHaveValue('')
})

test('ответы запрашиваются только после раскрытия, ссылка достаёт комментарий за первой страницей', async ({
  page,
}) => {
  await seedDiscussion(page)
  await page.addInitScript(
    ({ article_id, root_id }) => {
      const rows = JSON.parse(localStorage.getItem('mock_discussion_comments') ?? '[]')
      for (let n = 0; n < 25; n++)
        rows.push({
          ...rows[0],
          id: `7a1c2d30-1111-4a11-8a11-${String(100 + n).padStart(12, '0')}`,
          body: `Дополнительный корень ${n}`,
          reaction_counts: { laugh: 0, heart: 0, thumb: 0, fire: 0 },
          reactions: {},
          article_id,
          parent_id: null,
        })
      rows.push({
        ...rows[0],
        id: '7a1c2d30-1111-4a11-8a11-000000000999',
        body: 'Дальний ответ',
        article_id,
        parent_id: root_id,
      })
      localStorage.setItem('mock_discussion_comments', JSON.stringify(rows))
    },
    { article_id: ARTICLE_ID, root_id: ROOT_ID },
  )
  const reply_requests: string[] = []
  page.on('request', (request) => {
    if (request.url().includes('/replies')) reply_requests.push(request.url())
  })
  await page.goto('/p/statya-1')
  await expect(root(page)).toBeVisible()
  expect(reply_requests).toHaveLength(0)
  await root(page).getByRole('button', { name: '3 ответа', exact: true }).click()
  await expect(page.getByText('Дальний ответ')).toBeVisible()
  expect(reply_requests.length).toBeGreaterThan(0)
  await page.goto('/p/statya-1#comment-7a1c2d30-1111-4a11-8a11-000000000100')
  await expect(page.getByText('Дополнительный корень 0', { exact: true })).toBeVisible()
})

test('модератор обрабатывает жалобу на комментарий в отдельной очереди', async ({ page }) => {
  await seedDiscussion(page, 'admin')
  await page.addInitScript(
    ({ comment_id }) => {
      localStorage.setItem(
        'mock_comment_reports',
        JSON.stringify([
          {
            id: '00000000-0000-4000-8000-000000000001',
            comment_id,
            reporter_id: '0b3a4c50-3333-4c33-8c33-000000000005',
            reason: 'Спам в комментарии',
            status: 'open',
            created_at: new Date().toISOString(),
          },
        ]),
      )
    },
    { comment_id: ROOT_ID },
  )
  await page.goto('/admin/moderation')
  await page.getByRole('tab', { name: 'Жалобы на комментарии' }).click()
  await expect(page.getByText('Спам в комментарии', { exact: false })).toBeVisible()
  await page.getByRole('button', { name: 'Скрыть', exact: true }).click()
  await expect(page.getByText('Жалоб нет', { exact: true })).toBeVisible()
  await expect
    .poll(() =>
      page.evaluate(
        (id) =>
          JSON.parse(localStorage.getItem('mock_discussion_comments') ?? '[]').find(
            (item: { id: string }) => item.id === id,
          )?.status,
        ROOT_ID,
      ),
    )
    .toBe('hidden')
})
