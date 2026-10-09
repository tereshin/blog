import { expect, test } from '@playwright/test'

const TOPIC = '5f0f6a52-0d8b-4f6e-a8b1-000000000001'
const SECRET = 'Секретный абзац закрытой статьи'

function article(input: { id: string; slug: string; title: string; visibility: 'public' | 'members' | 'author'; comments_enabled: boolean; text: string }) {
  return {
    id: input.id,
    author_id: 'a1000000-0000-4000-8000-000000000001',
    author_name: 'Анна Авторова',
    author_slug: 'anna',
    title: input.title,
    blocks: { blocks: [{ type: 'paragraph', data: { text: input.text } }] },
    topic_id: TOPIC,
    visibility: input.visibility,
    comments_enabled: input.comments_enabled,
    slug: input.slug,
    status: 'published',
    published_at: new Date().toISOString(),
  }
}

test.describe('Доступ к статье', () => {
  test.describe.configure({ timeout: 60_000 })

  test('гость не видит текст статьи для участников, шапка остаётся', async ({ page }) => {
    const row = article({
      id: '00000000-0000-4000-8000-0000000000a1',
      slug: 'tolko-uchastnikam',
      title: 'Только своим',
      visibility: 'members',
      comments_enabled: true,
      text: SECRET,
    })
    await page.addInitScript((stored) => window.sessionStorage.setItem('mock_articles', JSON.stringify([stored])), row)
    await page.goto('/p/tolko-uchastnikam')
    await expect(page.getByText('Только для участников')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByRole('banner')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Войти' }).first()).toBeVisible()
    await expect(page.getByText(SECRET)).toHaveCount(0)
    await expect(page.getByText('Только своим')).toHaveCount(0)
  })

  test('выключенные комментарии прячут поле, текст статьи остаётся', async ({ page }) => {
    const row = article({
      id: '00000000-0000-4000-8000-0000000000a2',
      slug: 'bez-obsuzhdeniya',
      title: 'Без обсуждения',
      visibility: 'public',
      comments_enabled: false,
      text: 'Текст остаётся на странице',
    })
    await page.addInitScript((stored) => window.sessionStorage.setItem('mock_articles', JSON.stringify([stored])), row)
    await page.goto('/p/bez-obsuzhdeniya')
    await expect(page.getByText('Текст остаётся на странице')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByRole('textbox', { name: 'Написать комментарий' })).toHaveCount(0)
    await expect(page.getByRole('banner')).toBeVisible()
  })

  test('сужение доступа убирает карточку из ленты без перезагрузки', async ({ page }) => {
    const row = article({
      id: '00000000-0000-4000-8000-0000000000a3',
      slug: 'snachala-otkryta',
      title: 'Сначала открыта',
      visibility: 'public',
      comments_enabled: true,
      text: SECRET,
    })
    await page.addInitScript((stored) => window.sessionStorage.setItem('mock_articles', JSON.stringify([stored])), row)
    await page.goto('/')
    await expect(page.getByText('Сначала открыта')).toBeVisible({ timeout: 15_000 })
    await page.evaluate(async (id) => {
      const key = 'mock_articles'
      const raw = window.sessionStorage.getItem(key)
      const rows = raw ? (JSON.parse(raw) as { id: string; visibility: string }[]) : []
      window.sessionStorage.setItem(key, JSON.stringify(rows.map((item) => (item.id === id ? { ...item, visibility: 'members' } : item))))
      const events = (window as Window & { mockEvents?: { emit: (frame: object) => void } }).mockEvents
      events?.emit({ type: 'article', article_id: id, occurred_at: new Date().toISOString() })
    }, row.id)
    await expect(page.getByText('Сначала открыта')).toHaveCount(0)
    await expect(page.getByRole('banner')).toBeVisible()
  })
})
