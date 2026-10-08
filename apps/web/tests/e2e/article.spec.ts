import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

const WIDE = 1200

function isWide(page: Page): boolean {
  return (page.viewportSize()?.width ?? 0) >= WIDE
}

async function centerScroll(page: Page): Promise<number> {
  return page.evaluate(() => {
    const main = document.querySelector('main')
    if (!main) return 0
    const wide = window.matchMedia('(min-width: 1200px)').matches
    const scroller = wide ? main : main.parentElement
    return scroller?.scrollTop ?? 0
  })
}

test.describe('Страница статьи', () => {
  test('из ленты открывается в каркасе и возврат попадает на то же место', async ({ page }) => {
    await page.goto('/')
    const card = page.getByRole('main').getByRole('article').nth(4)
    await expect(card).toBeVisible()
    if (isWide(page)) {
      await page.getByRole('main').hover()
      await page.mouse.wheel(0, 700)
      await expect.poll(() => centerScroll(page)).toBeGreaterThan(150)
    }
    const before = await centerScroll(page)
    await card.getByRole('heading', { level: 2 }).getByRole('link').click()
    await expect(page).toHaveURL(/\/p\/statya-5$/)
    await expect(page.getByRole('banner').getByRole('link', { name: 'Назад' })).toBeVisible()
    await expect(page.getByRole('banner').getByText(/Статья 5/)).toHaveClass(/truncate/)
    await expect(page.getByRole('button', { name: 'Показать полностью' })).toHaveCount(0)
    await expect(page.getByRole('heading', { level: 1, name: /Статья 5/ })).toBeVisible()
    const images = page.getByRole('main').locator('img[alt="Первое изображение"], img[alt="Второе изображение"]')
    await expect(images).toHaveCount(2)
    const alts = await images.evaluateAll((nodes) => nodes.map((node) => node.getAttribute('alt')))
    expect(alts).toEqual(['Первое изображение', 'Второе изображение'])
    if (isWide(page)) {
      await expect(page.getByRole('navigation', { name: 'Навигация' }).getByRole('link', { name: 'Технологии' })).toHaveAttribute('aria-current', 'page')
    }
    await page.getByRole('banner').getByRole('link', { name: 'Назад' }).click()
    await expect(page).toHaveURL(/\/$/)
    if (isWide(page) && before > 150) {
      await expect.poll(() => centerScroll(page)).toBeGreaterThan(before - 80)
    }
  })

  test('прямая ссылка показывает каркас сразу, а возврат открывает свежее', async ({ page }) => {
    await page.goto('/p/statya-1')
    await expect(page.getByRole('banner')).toBeVisible()
    await expect(page.getByRole('complementary', { name: 'Популярные комментарии' })).toBeVisible()
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Статья 1')
    await page.getByRole('banner').getByRole('link', { name: 'Назад' }).click()
    await expect(page).toHaveURL(/\/$/)
    await expect(page.getByRole('main').getByRole('article').first()).toBeVisible()
  })

  test('автор видит полосу охвата, читатель — нет', async ({ page }) => {
    await page.goto('/p/statya-1')
    await expect(page.getByText('Ваш пост может собрать больше охватов')).toHaveCount(0)
    await page.addInitScript(() => window.localStorage.setItem('mock_article', 'own'))
    await page.goto('/p/statya-2')
    await expect(page.getByText('Ваш пост может собрать больше охватов')).toBeVisible()
    await expect(page.getByText('Купить показы')).toBeVisible()
  })

  test('несуществующая статья объясняется в центре, карточки остаются', async ({ page }) => {
    await page.goto('/p/net-takoy')
    await expect(page.getByRole('main').getByText('Такой статьи нет')).toBeVisible()
    if (isWide(page)) await expect(page.getByRole('navigation', { name: 'Навигация' })).toBeVisible()
    await expect(page.getByRole('complementary', { name: 'Популярные комментарии' })).toBeVisible()
  })
})
