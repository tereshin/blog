import { expect, test } from '@playwright/test'

for (const all_pages of [false, true]) {
  test(`свежее раскрывает просмотренные статьи автоматически: ${all_pages ? 'вся лента' : 'первая порция'}`, async ({ page }) => {
    await page.addInitScript(() => sessionStorage.setItem('bannerDismissed:fresh', '1'))
    await page.goto('/popular')
    await expect(page.getByRole('main').getByRole('article').first()).toBeVisible()

    // История просмотров приходит с API до первого открытия свежего.
    await page.evaluate(async (mark_all) => {
      let cursor: string | null = null
      do {
        const response = await fetch(`/v1/feed?mode=fresh${cursor ? `&cursor=${cursor}` : ''}`)
        if (!response.ok) throw new Error('Не удалось получить ленту')
        const data: { items: { id: string }[]; next_cursor: string | null } = await response.json()
        await Promise.all(data.items.map(async ({ id }) => {
          const seen = await fetch('/v1/feed-seen', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ feed_key: 'fresh', article_id: id }),
          })
          if (!seen.ok) throw new Error('Не удалось отметить просмотр')
        }))
        cursor = mark_all ? data.next_cursor : null
      } while (cursor)
    }, all_pages)

    await page.getByRole('banner').locator('a[href="/"]').click()
    const main = page.getByRole('main')
    const cards = main.getByRole('article')
    await expect(cards).toHaveCount(20)
    await expect(main.getByRole('heading', { name: /^Статья 1:/ })).toBeVisible()
    await expect(main.getByRole('button', { name: /Скрыт/ })).toHaveCount(0)
    await cards.last().scrollIntoViewIfNeeded()
    await expect(cards).toHaveCount(40)
    // Подгрузка непросмотренной порции не должна снова скрывать первые статьи.
    await expect(main.getByRole('heading', { name: /^Статья 1:/ })).toHaveCount(1)
  })
}

test('свежее скрывает только просмотренные статьи и позволяет раскрыть их вручную', async ({ page }) => {
  await page.goto('/popular')
  await expect(page.getByRole('main').getByRole('article').first()).toBeVisible()
  await page.evaluate(async () => {
    const response = await fetch('/v1/feed?mode=fresh')
    const data: { items: { id: string }[] } = await response.json()
    for (const { id } of data.items.slice(0, 2)) {
      const seen = await fetch('/v1/feed-seen', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feed_key: 'fresh', article_id: id }),
      })
      if (!seen.ok) throw new Error('Не удалось отметить просмотр')
    }
  })
  await page.getByRole('banner').locator('a[href="/"]').click()
  const main = page.getByRole('main')
  await expect(main.getByRole('article')).toHaveCount(18)
  await expect(main.getByRole('heading', { name: /^Статья 1:/ })).toHaveCount(0)
  await main.getByRole('button', { name: 'Скрыто 2 просмотренных поста' }).click()
  await expect(main.getByRole('article')).toHaveCount(20)
  await main.getByRole('button', { name: 'Убрать полосу' }).click()
  await expect(main.getByRole('article')).toHaveCount(18)
  await expect(main.getByRole('button', { name: /Скрыт/ })).toHaveCount(0)
})
