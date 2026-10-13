import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

const AUTHOR = '0b3a4c50-3333-4c33-8c33-000000000005'
const ARTICLE = '9b2e3f40-2222-4b22-8b22-000000000001'

const comments = Array.from({ length: 45 }, (_, index) => ({
  id: `00000000-0000-4000-8000-${String(500 + index).padStart(12, '0')}`,
  article_id: ARTICLE,
  parent_id: null,
  author: { user_id: AUTHOR, display_name: 'Роман Читаев', avatar_url: null },
  body: `Комментарий профиля ${index + 1}`,
  status: 'visible',
  edited_at: null,
  reaction_counts: { heart: 0, fire: index + 1, laugh: 0, thumb: 0 },
  reactions: {},
  created_at: new Date(Date.UTC(2026, 9, 1, 0, index)).toISOString(),
}))

test.beforeEach(async ({ page }, test_info) => {
  await page.addInitScript((seed) => {
    window.localStorage.setItem('mock_viewer', 'member')
    window.localStorage.setItem('mock_discussion_comments', JSON.stringify(seed))
  }, comments)
  await page.goto('/u/reader')
  await page.getByRole('tab', { name: 'Комментарии', exact: true }).click()
  if (test_info.project.use.colorScheme === 'light') {
    await page
      .getByRole('navigation', { name: 'Навигация' })
      .getByRole('link', { name: 'Тёмная тема', exact: true })
      .click()
    await page.getByRole('menuitemradio', { name: 'Светлая', exact: true }).click()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  }
})

test('карточки показывают автора, контекст и действия; три страницы добавляются без повторов', async ({
  page,
}) => {
  const panel = page.getByRole('tabpanel', { name: 'Комментарии' })
  const items = panel.getByRole('listitem')
  await expect(items).toHaveCount(20)
  const first = items.first()
  await expect(first.getByText('Роман Читаев', { exact: true })).toBeVisible()
  await expect(first.getByText('в посте', { exact: true })).toBeVisible()
  await expect(first.locator('time')).toBeVisible()
  const excerpt = first.getByRole('link', { name: 'Комментарий профиля 45', exact: true })
  const reply = first.getByRole('link', { name: 'Ответить', exact: true })
  await expect(reply).toHaveAttribute('href', (await excerpt.getAttribute('href')) ?? '')
  await expect(first.getByRole('button', { name: 'Огонь 45', exact: true })).toBeVisible()
  await expect(first.getByRole('button', { name: 'Сердце', exact: true })).toBeVisible()
  await expect(
    first.getByRole('button', { name: 'Сердце', exact: true }).locator('svg'),
  ).toBeVisible()
  await expect(first.getByRole('button', { name: 'Добавить реакцию', exact: true })).toBeVisible()
  const more = panel.getByRole('button', { name: 'Ещё', exact: true })
  await first.scrollIntoViewIfNeeded()
  await page.screenshot({
    path: `test-results/profile-comments-${test.info().project.name}.png`,
    fullPage: false,
  })
  for (const count of [40, 45]) {
    const response = page.waitForResponse(
      (response) =>
        response.url().includes(`/users/${AUTHOR}/comments?`) &&
        response.url().includes('cursor=') &&
        response.ok(),
    )
    await more.click()
    await response
    await expect(items).toHaveCount(count)
  }
  await expect(more).toHaveCount(0)
  expect(
    await items
      .locator('a')
      .filter({ hasText: /^Комментарий профиля/ })
      .allTextContents(),
  ).toEqual(comments.toReversed().map((item) => item.body))
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  )
  const accessibility = await new AxeBuilder({ page }).include('main').analyze()
  expect(
    accessibility.violations.filter(
      (item) => item.impact === 'serious' || item.impact === 'critical',
    ),
  ).toEqual([])
})

test('смена сортировки начинает выдачу с первой страницы, вкладки сохраняют загруженные страницы', async ({
  page,
}) => {
  const panel = page.getByRole('tabpanel', { name: 'Комментарии' })
  await expect(panel.getByRole('listitem')).toHaveCount(20)
  await panel.getByRole('button', { name: 'Ещё', exact: true }).click()
  await expect(panel.getByRole('listitem')).toHaveCount(40)
  await page.getByRole('tab', { name: 'Посты', exact: true }).click()
  await page.getByRole('tab', { name: 'Комментарии', exact: true }).click()
  await expect(panel.getByRole('listitem')).toHaveCount(40)
  await page.getByRole('main').getByRole('link', { name: 'Свежее', exact: true }).click()
  const response = page.waitForResponse((response) =>
    response.url().includes(`/users/${AUTHOR}/comments?sort=popular`),
  )
  await page.getByRole('menuitemradio', { name: 'Популярное', exact: true }).click()
  expect(new URL((await response).url()).searchParams.has('cursor')).toBe(false)
  await expect(panel.getByRole('listitem')).toHaveCount(20)
})

test('ошибка следующей страницы сохраняет карточки и позволяет повторить загрузку', async ({
  page,
}) => {
  const panel = page.getByRole('tabpanel', { name: 'Комментарии' })
  await expect(panel.getByRole('listitem')).toHaveCount(20)
  await page.evaluate(() => window.localStorage.setItem('mock_profile_comments_fail_next', '1'))
  await panel.getByRole('button', { name: 'Ещё', exact: true }).click()
  await expect(panel.getByRole('alert')).toBeVisible({ timeout: 20_000 })
  await expect(panel.getByRole('listitem')).toHaveCount(20)
  await page.evaluate(() => window.localStorage.removeItem('mock_profile_comments_fail_next'))
  await panel.getByRole('button', { name: 'Повторить', exact: true }).click()
  await expect(panel.getByRole('listitem')).toHaveCount(40)
  await expect(panel.getByRole('alert')).toHaveCount(0)
})

test('реакция обновляет карточку, а меню сохраняет комментарий', async ({ page }) => {
  const first = page.getByRole('tabpanel', { name: 'Комментарии' }).getByRole('listitem').first()
  await expect(first.getByRole('button', { name: 'Сердце', exact: true })).toBeVisible()
  await first.getByRole('button', { name: 'Сердце', exact: true }).click()
  await expect(first.getByRole('button', { name: 'Сердце 1', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await first.getByRole('link', { name: 'Меню комментария', exact: true }).click()
  await page.getByRole('menuitem', { name: 'В закладки', exact: true }).click()
  await first.getByRole('link', { name: 'Меню комментария', exact: true }).click()
  await expect(
    page.getByRole('menuitem', { name: 'Убрать из закладок', exact: true }),
  ).toBeVisible()
})
