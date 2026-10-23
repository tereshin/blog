import { expect, test } from '@playwright/test'

const ARTICLE = '9b2e3f40-2222-4b22-8b22-000000000001'
const TARGET = '7a1c2d30-1111-4a11-8a11-000000000164'

test('якорь находит виртуализированный комментарий и не возвращает к нему после ручной прокрутки', async ({ page }) => {
  await page.addInitScript((article_id) => {
    localStorage.setItem('mock_viewer', 'member')
    const comments = Array.from({ length: 65 }, (_, i) => ({
      id: `7a1c2d30-1111-4a11-8a11-${String(100 + i).padStart(12, '0')}`,
      article_id,
      parent_id: null,
      body: `Корень ${i}`,
      status: 'visible',
      edited_at: null,
      author: { user_id: '0b3a4c50-3333-4c33-8c33-000000000005', display_name: 'Роман Читаев', avatar_url: null },
      reaction_counts: { heart: 0 },
      reactions: {},
      created_at: '2026-10-02T12:00:00.000Z',
    }))
    localStorage.setItem('mock_discussion_comments', JSON.stringify(comments))
    const original_fetch = window.fetch.bind(window)
    window.fetch = async (input, init) => {
      const url = new URL(input instanceof Request ? input.url : String(input), location.href)
      if (url.pathname === `/v1/articles/${article_id}/comments`) return Response.json({
        comments: comments.map((comment) => ({ ...comment, reaction_count: 0, my_reaction: null, replies: [] })),
        next_cursor: null,
      })
      return original_fetch(input, init)
    }
  }, ARTICLE)
  await page.goto('/p/statya-1')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 20_000 })
  const discussion = page.locator('#comments')
  await expect(discussion.locator('[data-index]').first()).toBeAttached()
  await page.evaluate((target) => {
    const state = history.state
    history.pushState({ ...state, key: 'virtual-anchor', idx: state.idx + 1 }, '', `#comment-${target}`)
    window.dispatchEvent(new PopStateEvent('popstate'))
  }, TARGET)
  const target = page.locator(`#comment-${TARGET}`)
  await expect(target).toHaveAttribute('data-comment-highlighted', 'true')
  await expect(target).toBeInViewport()
  await page.evaluate(() => window.scrollTo(0, 0))
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0)
  // Trigger another render while the hash remains; it must not restart anchor navigation.
  await page.evaluate(() => window.dispatchEvent(new Event('resize')))
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0)
})

test('прямой #comments ждёт загрузки статьи; неизвестный комментарий не ломает обсуждение', async ({ page }) => {
  let releaseCover = () => {}
  const cover_ready = new Promise<void>((resolve) => { releaseCover = resolve })
  await page.context().route('**/fixtures/article-cover.svg', async (route) => {
    await cover_ready
    await route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="720" height="405"><rect width="720" height="405" fill="#445"/></svg>' })
  })
  await page.addInitScript(() => {
    const original_fetch = window.fetch.bind(window)
    window.fetch = async (input, init) => {
      const url = new URL(input instanceof Request ? input.url : String(input), location.href)
      if (url.pathname === '/v1/articles/statya-1') await new Promise((resolve) => setTimeout(resolve, 600))
      return original_fetch(input, init)
    }
  })
  await page.goto('/p/statya-1#comments')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 20_000 })
  const cover = page.locator('img[src$="/fixtures/article-cover.svg"]')
  await expect(cover).toHaveJSProperty('complete', false)
  // The anchor gets its first frame while the image above it still has no intrinsic size.
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))))
  releaseCover()
  await expect(cover).toHaveJSProperty('naturalWidth', 720)
  await expect(page.locator('#comments')).toBeInViewport()
  await page.goto('/p/statya-1#comment-00000000-0000-4000-8000-000000000000')
  await expect(page.locator('#comments')).toBeVisible()
  await expect(page.locator('[data-comment-highlighted]')).toHaveCount(0)
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
})
