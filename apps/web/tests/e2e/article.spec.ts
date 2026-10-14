import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

const THREE_COLUMNS = 1280
const LEFT_COLUMN = 768

function hasThreeColumns(page: Page): boolean {
  return (page.viewportSize()?.width ?? 0) >= THREE_COLUMNS
}

function hasLeftColumn(page: Page): boolean {
  return (page.viewportSize()?.width ?? 0) >= LEFT_COLUMN
}

async function centerScroll(page: Page): Promise<number> {
  return page.evaluate(() => window.scrollY)
}

test.describe('Страница статьи', () => {
  test('панель действий объединяет комментарии, закладку, ссылку и просмотры', async ({ page }, testInfo) => {
    await page.addInitScript(() => window.localStorage.setItem('mock_viewer', 'member'))
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write'])
    const states_ready = page.waitForResponse((response) => response.url().includes('/v1/me/article-states'))
    await page.goto('/p/statya-1')
    await states_ready
    const article = page.getByRole('main').getByRole('article').first()
    const comments = article.getByRole('link', { name: /комментар/ })
    const bookmark = article.getByRole('button', { name: 'В закладки', exact: true })
    const share = article.getByRole('button', { name: 'Поделиться', exact: true })
    const views = article.locator('span[aria-label$="просмотр"], span[aria-label$="просмотра"], span[aria-label$="просмотров"]')
    await expect(comments).toHaveAttribute('href', '/p/statya-1#comments')
    await expect(views).toBeVisible()
    const boxes = await Promise.all([comments, bookmark, share, views].map((control) => control.boundingBox()))
    const centers = boxes.map((box) => {
      if (!box) throw new Error('Действие статьи должно быть видимым')
      return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
    })
    expect(Math.max(...centers.map(({ y }) => y)) - Math.min(...centers.map(({ y }) => y))).toBeLessThan(1)
    for (const [index, center] of centers.entries()) {
      const previous = centers[index - 1]
      if (previous) expect(center.x).toBeGreaterThan(previous.x)
    }

    const initial_count = Number(await bookmark.innerText())
    await bookmark.click()
    const saved = article.getByRole('button', { name: 'Убрать из закладок', exact: true })
    await expect(saved).toHaveAttribute('aria-pressed', 'true')
    await expect(saved).toHaveText(String(initial_count + 1))
    await saved.click()
    await expect(bookmark).toHaveAttribute('aria-pressed', 'false')
    await expect(bookmark).toHaveText(String(initial_count))

    await share.click()
    await expect(page.getByText('Ссылка скопирована')).toBeVisible()
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(`${new URL(page.url()).origin}/p/statya-1`)
    await article.screenshot({ path: testInfo.outputPath('article-actions.png') })
    await comments.click()
    await expect(page).toHaveURL(/\/p\/statya-1#comments$/)
    await expect(page.locator('#comments')).toBeInViewport()
  })

  test('показывает засчитанные просмотры и сохраняет число при повторном открытии', async ({ page }) => {
    const view_response = page.waitForResponse((response) => response.url().endsWith('/views') && response.request().method() === 'POST')
    await page.goto('/p/statya-1')
    const response = await view_response
    expect(response.status()).toBe(200)
    const result = await response.json() as { counted: boolean; view_count: number }
    expect(result.counted).toBe(true)
    await expect(page.getByRole('main').locator('span[aria-label$="просмотр"], span[aria-label$="просмотра"], span[aria-label$="просмотров"]')).toHaveText(String(result.view_count))
    const repeated = page.waitForResponse((next) => next.url().endsWith('/views') && next.request().method() === 'POST')
    await page.reload()
    expect(await (await repeated).json()).toEqual({ counted: false, view_count: result.view_count })
    await expect(page.getByRole('main').locator('span[aria-label$="просмотр"], span[aria-label$="просмотра"], span[aria-label$="просмотров"]')).toHaveText(String(result.view_count))
  })

  test('из ленты открывается в каркасе и возврат попадает на то же место', async ({ page }) => {
    await page.goto('/')
    const card = page.getByRole('main').getByRole('article').nth(4)
    await expect(card).toBeVisible()
    if (hasThreeColumns(page)) {
      await page.getByRole('main').hover()
      await page.mouse.wheel(0, 700)
      await expect.poll(() => centerScroll(page)).toBeGreaterThan(150)
    }
    const before = await centerScroll(page)
    await card.getByRole('heading', { level: 2 }).getByRole('link').click()
    await expect(page).toHaveURL(/\/p\/statya-5$/)
    await expect(page.getByRole('banner').getByRole('link', { name: 'Назад' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Показать полностью' })).toHaveCount(0)
    await expect(page.getByRole('heading', { level: 1, name: /Статья 5/ })).toBeVisible()
    const images = page
      .getByRole('main')
      .locator('img[alt="Первое изображение"], img[alt="Второе изображение"]')
    await expect(images).toHaveCount(2)
    const alts = await images.evaluateAll((nodes) => nodes.map((node) => node.getAttribute('alt')))
    expect(alts).toEqual(['Первое изображение', 'Второе изображение'])
    if (hasLeftColumn(page)) {
      await expect(
        page
          .getByRole('navigation', { name: 'Навигация' })
          .getByRole('link', { name: 'Технологии' }),
      ).toHaveAttribute('aria-current', 'page')
    }
    await page.getByRole('banner').getByRole('link', { name: 'Назад' }).click()
    await expect(page).toHaveURL(/\/$/)
    if (hasThreeColumns(page) && before > 150) {
      await expect.poll(() => centerScroll(page)).toBeGreaterThan(before - 80)
    }
  })

  test('прямая ссылка показывает каркас сразу, а возврат открывает свежее', async ({ page }) => {
    await page.goto('/p/statya-1')
    await expect(page.getByRole('banner')).toBeVisible()
    if (hasThreeColumns(page))
      await expect(
        page.getByRole('complementary', { name: 'Популярные комментарии' }),
      ).toBeVisible()
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Статья 1')
    await page.getByRole('banner').getByRole('link', { name: 'Назад' }).click()
    await expect(page).toHaveURL(/\/$/)
    await expect(page.getByRole('main').getByRole('article').first()).toBeVisible()
  })

  test('автор и читатель видят статью без покупки показов', async ({ page }) => {
    await page.goto('/p/statya-1')
    await expect(page.getByText('Ваш пост может собрать больше охватов')).toHaveCount(0)
    await page.addInitScript(() => window.localStorage.setItem('mock_article', 'own'))
    await page.goto('/p/statya-2')
    await expect(page.getByText('Ваш пост может собрать больше охватов')).toHaveCount(0)
    await expect(page.getByText('Купить показы')).toHaveCount(0)
  })

  test('несуществующая статья объясняется в центре, карточки остаются', async ({ page }) => {
    await page.goto('/p/net-takoy')
    await expect(page.getByRole('main').getByText('Такой статьи нет')).toBeVisible()
    if (hasLeftColumn(page))
      await expect(page.getByRole('navigation', { name: 'Навигация' })).toBeVisible()
    if (hasThreeColumns(page))
      await expect(
        page.getByRole('complementary', { name: 'Популярные комментарии' }),
      ).toBeVisible()
  })
})
