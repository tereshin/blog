import { expect, test } from '@playwright/test'

test('чтения не дублируются при открытии и переходах в StrictMode', async ({ page }) => {
  await page.addInitScript(() => window.localStorage.setItem('mock_viewer', 'member'))
  const reads: string[] = []
  const pending = new Set<string>()
  page.on('request', (request) => {
    const url = new URL(request.url())
    if (request.method() !== 'GET' || !url.pathname.startsWith('/v1/') || url.pathname === '/v1/events') return
    reads.push(`${url.pathname}${url.search}`)
    pending.add(request.url())
  })
  page.on('requestfinished', (request) => pending.delete(request.url()))
  page.on('requestfailed', (request) => pending.delete(request.url()))

  await page.goto('/')
  await expect(page.getByRole('main').getByRole('article').first()).toBeVisible()
  await expect.poll(() => reads.some((url) => url.startsWith('/v1/me/article-states?'))).toBe(true)
  await expect.poll(() => pending.size).toBe(0)
  for (const path of ['/v1/settings', '/v1/auth/session', '/v1/topics', '/v1/comments/popular']) {
    expect(reads.filter((url) => url === path), path).toHaveLength(1)
  }
  expect(new Set(reads).size, JSON.stringify(reads)).toBe(reads.length)

  for (const path of ['/popular', '/t/tehnologii', '/']) {
    await page.evaluate((next) => {
      const current = window.history.state as { idx?: number } | null
      window.history.pushState({ usr: null, key: crypto.randomUUID(), idx: (current?.idx ?? 0) + 1 }, '', next)
      window.dispatchEvent(new PopStateEvent('popstate'))
    }, path)
    await expect(page.locator(`[data-shell-scroll="left"] a[href="${path}"]`)).toHaveAttribute('aria-current', 'page')
    await expect(page.getByRole('main').getByRole('article').first()).toBeVisible()
    await expect.poll(() => pending.size).toBe(0)
    expect(new Set(reads).size, JSON.stringify(reads)).toBe(reads.length)
  }
})
