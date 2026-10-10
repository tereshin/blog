import { expect, test } from '@playwright/test'
import type { PopularComment } from '@blog/contracts'

test('сайдбар показывает два комментария и только их настоящие реакции под шапкой', async ({
  page,
}) => {
  test.skip((page.viewportSize()?.width ?? 0) < 1280, 'Правый сайдбар виден от 1280px')
  const response = page.waitForResponse(
    (response) => response.url().includes('/v1/comments/popular') && response.ok(),
  )
  await page.goto('/')
  const comments = (await (await response).json()) as PopularComment[]
  const rail = page.getByRole('complementary', { name: 'Популярные комментарии' })
  const items = rail.getByRole('listitem')
  await expect(items).toHaveCount(Math.min(2, comments.length))

  for (const [index, comment] of comments.slice(0, 2).entries()) {
    const item = items.nth(index)
    const link = item.getByRole('link')
    const header = link.locator(':scope > span').first()
    const excerpt = item.getByText(comment.excerpt, { exact: true })
    await expect(excerpt).toBeVisible()
    const header_box = await header.boundingBox()
    const excerpt_box = await excerpt.boundingBox()
    expect(header_box).not.toBeNull()
    expect(excerpt_box).not.toBeNull()
    if (!header_box || !excerpt_box) throw new Error('Шапка и текст должны быть видны')
    expect(excerpt_box.y).toBeGreaterThanOrEqual(header_box.y + header_box.height)
    expect(excerpt_box.x).toBeCloseTo(header_box.x, 0)
    expect(excerpt_box.width).toBeCloseTo(header_box.width, 0)

    const labels = { laugh: 'Смех', heart: 'Сердце', thumb: 'Палец вверх', fire: 'Огонь' }
    const reaction_group = link.locator(':scope > span').nth(2)
    await expect(
      reaction_group.locator(':scope > span').first().locator(':scope > span'),
    ).toHaveCount(Object.values(comment.reaction_counts).filter((count) => count > 0).length)
    for (const [kind, count] of Object.entries(comment.reaction_counts)) {
      if (count > 0) {
        await expect(
          reaction_group.locator(`[aria-label="${labels[kind as keyof typeof labels]} ${count}"]`),
        ).toBeVisible()
      }
    }
    await expect(reaction_group).toContainText(String(comment.reaction_count))
    await expect(reaction_group.locator('.rounded-full')).toHaveCount(0)
    const reactions_box = await reaction_group.boundingBox()
    if (!reactions_box) throw new Error('Реакции должны быть видны')
    expect(reactions_box.y).toBeGreaterThanOrEqual(excerpt_box.y + excerpt_box.height)
  }
})
