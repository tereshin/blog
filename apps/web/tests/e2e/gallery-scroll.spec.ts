import { expect, test } from '@playwright/test'
import type { Locator, Page } from '@playwright/test'

async function checkGallery(page: Page, gallery: Locator, card: Locator) {
  const rail = gallery.locator('.gallery__rail')
  await gallery.scrollIntoViewIfNeeded()
  const viewport = await rail.boundingBox()
  const container = await card.boundingBox()
  if (!viewport || !container) throw new Error('Gallery is missing')
  expect(Math.abs(viewport.x - container.x)).toBeLessThanOrEqual(1)
  expect(Math.abs(viewport.x + viewport.width - container.x - container.width)).toBeLessThanOrEqual(1)
  const first = await gallery.locator('.gallery__item').first().boundingBox()
  expect((first?.x ?? 0) - viewport.x).toBeGreaterThanOrEqual(16)
  const previous = gallery.locator('.gallery__arrow--previous')
  const next = gallery.locator('.gallery__arrow--next')
  await page.mouse.move(0, 0)
  await expect(next).toHaveCSS('opacity', '0')
  await rail.hover()
  await expect(previous).toBeHidden()
  await expect(next).toBeVisible()
  await expect(next).toHaveCSS('opacity', '1')
  const initial_y = await page.evaluate(() => scrollY)
  // Native wheel input matches the two axes emitted by a trackpad; no synthetic scroll assignment.
  await page.mouse.wheel(220, 0)
  await expect.poll(() => rail.evaluate((node) => node.scrollLeft)).toBeGreaterThan(100)
  expect(await page.evaluate(() => scrollY)).toBe(initial_y)
  await expect(previous).toBeVisible()
  await page.mouse.wheel(10000, 0)
  await expect(next).toBeHidden()
  await expect(previous).toBeVisible()
  const end_padding = await rail.evaluate((node) => {
    const last = node.lastElementChild?.getBoundingClientRect()
    return last ? node.getBoundingClientRect().right - last.right : 0
  })
  expect(end_padding).toBeGreaterThanOrEqual(16)
  await page.mouse.wheel(-10000, 0)
  await expect(previous).toBeHidden()
  await expect(next).toBeVisible()
  await page.mouse.wheel(0, 180)
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(initial_y + 50)
  expect(await rail.evaluate((node) => node.scrollLeft)).toBe(0)
  await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }))
}

test('тачпад, края карточки и стрелки галереи в ленте и статье', async ({ page }, test_info) => {
  await page.addInitScript(() => {
    localStorage.setItem('mock_viewer', 'member')
    const items = [
      { url: `${location.origin}/tests/e2e/fixtures/gallery/portrait.png`, width: 300, height: 400 },
      { url: `${location.origin}/tests/e2e/fixtures/gallery/landscape.png`, width: 640, height: 400 },
      { url: `${location.origin}/tests/e2e/fixtures/gallery/square.png`, width: 400, height: 400 },
    ]
    sessionStorage.setItem('mock_articles', JSON.stringify([{
      id: 'fe000000-0000-4000-8000-000000000001', author_id: '0b3a4c50-3333-4c33-8c33-000000000005',
      author_name: 'Роман Читаев', author_slug: 'reader', title: 'Галерея жестов', slug: 'galereya-zhestov',
      topic_id: '10000000-0000-4000-8000-000000000001', status: 'published', visibility: 'public',
      published_at: '2026-10-29T00:00:00.000Z', comments_enabled: false,
      blocks: { blocks: [
        { type: 'gallery', data: { items, caption: 'Галерея с прокруткой' } },
        ...Array.from({ length: 15 }, () => ({ type: 'paragraph', data: { text: 'Текст статьи для проверки свободной вертикальной прокрутки страницы.' } })),
        { type: 'gallery', data: { items: items.slice(0, 1), caption: 'Один снимок' } },
      ] },
    }]))
  })
  await page.goto('/')
  const card = page.getByRole('article').filter({ has: page.getByRole('link', { name: 'Галерея жестов', exact: true }) })
  await expect(card.locator('.image-gallery')).toBeVisible()
  await checkGallery(page, card.locator('.image-gallery'), card)
  await card.getByRole('link', { name: 'Галерея жестов', exact: true }).click()
  const article = page.locator('article').filter({ has: page.getByRole('heading', { name: 'Галерея жестов', exact: true }) })
  const gallery = article.locator('.image-gallery').first()
  await expect(gallery).toBeVisible()
  await checkGallery(page, gallery, article.locator('..'))
  await gallery.locator('.gallery__rail').hover()
  await page.mouse.wheel(220, 0)
  await expect(gallery.locator('.gallery__arrow--previous')).toBeVisible()
  await article.locator('..').screenshot({ path: test_info.outputPath('gallery-card-edges.png'), animations: 'disabled' })
  const single = article.locator('.image-gallery').last()
  await single.scrollIntoViewIfNeeded()
  await single.locator('.gallery__rail').hover()
  await expect(single.locator('.gallery__arrow--previous')).toBeHidden()
  await expect(single.locator('.gallery__arrow--next')).toBeHidden()
  expect(await page.evaluate(() => document.body.scrollWidth <= innerWidth)).toBe(true)
})
