import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

test.describe('Общий каркас профиля и темы', () => {
  test('шапки совпадают по размерам, вкладки компактны, страницы доступны', async ({ page }) => {
    const page_errors: string[] = []
    page.on('pageerror', (error) => page_errors.push(error.message))
    const sizes: { cover_height: number; avatar_width: number }[] = []
    for (const [route, title] of [
      ['/u/anna', 'Анна Авторова'],
      ['/t/tehnologii', 'Технологии'],
    ] as const) {
      await page.goto(route)
      const main = page.getByRole('main')
      await expect(main.getByRole('heading', { name: title, exact: true })).toBeVisible()
      const header = main.locator('.identity-header')
      const cover = await header.locator(':scope > div').first().boundingBox()
      const avatar = await header.locator('.avatar').first().boundingBox()
      expect(cover).not.toBeNull()
      expect(avatar).not.toBeNull()
      if (!cover || !avatar) throw new Error('Не найдены обложка и аватар')
      sizes.push({ cover_height: cover.height, avatar_width: avatar.width })
      expect(avatar.y).toBeLessThan(cover.y + cover.height)
      expect(avatar.y + avatar.height).toBeGreaterThan(cover.y + cover.height)
      const tab = await main.getByRole('tab', { name: 'Посты', exact: true }).boundingBox()
      if (!tab) throw new Error('Не найдена вкладка постов')
      expect(tab.width).toBeLessThan(100)
      expect(tab.x).toBeCloseTo(avatar.x, 0)
      const first_article = await main.getByRole('article').first().boundingBox()
      const header_box = await header.boundingBox()
      if (!first_article || !header_box) throw new Error('Не найдены шапка и пост')
      expect(first_article.width).toBeCloseTo(header_box.width, 0)
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      ).toBe(true)
      const results = await new AxeBuilder({ page }).include('main').analyze()
      expect(
        results.violations.filter(
          (item) => item.impact === 'serious' || item.impact === 'critical',
        ),
      ).toEqual([])
    }
    expect(sizes[0]).toEqual(sizes[1])
    expect(page_errors).toEqual([])
  })

  test('сортировка постов и комментариев передаётся серверу и сохраняется между вкладками', async ({
    page,
  }) => {
    await page.goto('/u/reader')
    await page.getByRole('button', { name: 'Свежее', exact: true }).click()
    await expect(page.getByRole('menuitemradio', { name: 'Свежее' })).toHaveAttribute(
      'aria-checked',
      'true',
    )
    const posts_response = page.waitForResponse(
      (response) =>
        response.url().includes('/profiles/reader/articles') &&
        response.url().includes('sort=popular'),
    )
    await page.getByRole('menuitemradio', { name: 'Популярное' }).click()
    expect((await posts_response).ok()).toBe(true)
    await expect(page.getByRole('button', { name: 'Популярное', exact: true })).toBeVisible()
    const comments_response = page.waitForResponse(
      (response) =>
        response.url().includes('/comments?') && response.url().includes('sort=popular'),
    )
    await page.getByRole('tab', { name: 'Комментарии', exact: true }).click()
    expect((await comments_response).ok()).toBe(true)
    await expect(page.getByText('Главное — стабильный порядок.')).toBeVisible()
    await page.getByRole('tab', { name: 'Посты', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Популярное', exact: true })).toBeVisible()
    await expect(page.getByRole('main').getByRole('article')).toBeVisible()
  })

  test('пост профиля обновляет реакции и закладки и раскрывает полный текст', async ({ page }) => {
    await page.addInitScript(() => window.localStorage.setItem('mock_viewer', 'member'))
    await page.goto('/u/reader')
    const article = page.getByRole('main').getByRole('article')
    await expect(article).toBeVisible()
    const bookmarked = page.waitForResponse(
      (response) => response.url().includes('/bookmarks/') && response.request().method() === 'PUT',
    )
    await article.getByRole('button', { name: 'В закладки', exact: true }).click()
    const bookmark_data = (await (await bookmarked).json()) as { bookmark_count: number }
    await expect(article.getByRole('button', { name: 'Убрать из закладок' })).toHaveText(
      String(bookmark_data.bookmark_count),
    )
    await article.getByRole('button', { name: 'Добавить реакцию' }).click()
    const reacted = page.waitForResponse(
      (response) => response.url().endsWith('/reactions') && response.request().method() === 'POST',
    )
    await page.getByRole('menuitem', { name: 'Сердце', exact: true }).click()
    const reaction_data = (await (await reacted).json()) as { reaction_counts: { heart: number } }
    const reaction = article.getByRole('button', {
      name: `Сердце ${reaction_data.reaction_counts.heart}`,
      exact: true,
    })
    await expect(reaction).toHaveAttribute('aria-pressed', 'true')
    await page.getByRole('tab', { name: 'Комментарии', exact: true }).click()
    await expect(page.getByText('Главное — стабильный порядок.')).toBeVisible()
    await page.getByRole('tab', { name: 'Посты', exact: true }).click()
    await expect(reaction).toHaveAttribute('aria-pressed', 'true')
    await expect(article.getByRole('button', { name: 'Убрать из закладок' })).toHaveText(
      String(bookmark_data.bookmark_count),
    )
    await article.getByRole('button', { name: 'Показать полностью' }).click()
    await expect(article.getByText('Полный текст статьи для проверки раскрытия.')).toBeVisible()
    await article.getByRole('button', { name: 'Свернуть' }).click()
    await expect(article.getByText('Полный текст статьи для проверки раскрытия.')).toHaveCount(0)
  })

  test('редактирование и настройки своего профиля остаются доступны', async ({ page }) => {
    await page.addInitScript(() => window.localStorage.setItem('mock_viewer', 'member'))
    await page.goto('/u/reader')
    await page.getByRole('button', { name: 'Редактировать', exact: true }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.keyboard.press('Escape')
    await page.getByRole('button', { name: 'Настройки', exact: true }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Статистика' })).toHaveCount(0)
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).toHaveCount(0)
  })
})
