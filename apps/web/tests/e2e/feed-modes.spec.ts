import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

const WIDE = 1200

function isWide(page: Page): boolean {
  return (page.viewportSize()?.width ?? 0) >= WIDE
}

test.describe('Режимы ленты', () => {
  test.beforeEach(({ page }) => {
    test.skip(!isWide(page), 'Подсветка и три колонки проверяются от 1200px')
  })

  test('популярное, свежее и тема меняют центр и подсветку, шапка и карточки остаются', async ({ page }) => {
    await page.goto('/popular')
    const banner = page.getByRole('banner')
    const nav = page.getByRole('navigation', { name: 'Навигация' })
    const mount_id = await banner.getAttribute('data-mount-id')
    await expect(nav.getByRole('link', { name: 'Популярное' })).toHaveAttribute('aria-current', 'page')
    await expect(page.getByRole('main').getByRole('article').first()).toBeVisible({ timeout: 15_000 })
    await expect(page.getByRole('complementary', { name: 'Популярные комментарии' })).toBeVisible()

    await nav.getByRole('link', { name: 'Свежее' }).click()
    await expect(nav.getByRole('link', { name: 'Свежее' })).toHaveAttribute('aria-current', 'page')
    await expect(nav.getByRole('link', { name: 'Популярное' })).not.toHaveAttribute('aria-current', 'page')
    await expect(page.getByRole('main').getByRole('article').first()).toBeVisible()
    await expect(banner).toHaveAttribute('data-mount-id', mount_id ?? '')

    await nav.getByRole('link', { name: 'Технологии' }).click()
    await expect(page.getByRole('main').getByRole('heading', { name: 'Технологии', exact: true })).toBeVisible()
    await expect(nav.getByRole('link', { name: 'Технологии' })).toHaveAttribute('aria-current', 'page')
    await expect(banner).toHaveAttribute('data-mount-id', mount_id ?? '')
    await expect(page.getByRole('complementary', { name: 'Популярные комментарии' })).toBeVisible()
  })

  test('«Показать все» раскрывает длинный список тем в той же карточке', async ({ page }) => {
    await page.addInitScript(() => window.localStorage.setItem('mock_topics', 'long'))
    await page.goto('/')
    const scroller = page.locator('[data-shell-scroll="left"]')
    await scroller.getByRole('button', { name: 'Показать все' }).click()
    await expect(scroller.getByRole('button', { name: 'Свернуть' })).toBeVisible()
    await expect(scroller.getByText('Длинная тема 20')).toBeAttached()
  })

  test('шапка темы стоит над списком, пункт темы выбран', async ({ page }) => {
    await page.goto('/t/tehnologii')
    const main = page.getByRole('main')
    const follow = main.getByRole('button', { name: 'Подписаться' })
    const article = main.getByRole('article').first()
    await expect(follow).toBeVisible({ timeout: 15_000 })
    await expect(article).toBeVisible()
    const follow_box = await follow.boundingBox()
    const article_box = await article.boundingBox()
    expect(follow_box && article_box && follow_box.y < article_box.y).toBe(true)
    await expect(page.getByRole('navigation', { name: 'Навигация' }).getByRole('link', { name: 'Технологии' })).toHaveAttribute('aria-current', 'page')
  })

  test('участник без подписок видит объяснение и ссылку на популярное', async ({ page }) => {
    await page.addInitScript(() => window.localStorage.setItem('mock_viewer', 'member'))
    await page.goto('/feed')
    const main = page.getByRole('main')
    await expect(main.getByText('Лента собирается из подписок на авторов и темы')).toBeVisible({ timeout: 15_000 })
    await expect(main.getByRole('link', { name: 'Популярное' })).toHaveAttribute('href', '/popular')
  })

  test('гость на своей ленте видит просьбу войти, адрес не меняется', async ({ page }) => {
    await page.goto('/feed')
    await expect(page.getByRole('main').getByText('Войдите, чтобы собрать свою ленту')).toBeVisible({ timeout: 15_000 })
    await page.getByRole('main').getByRole('button', { name: 'Войти' }).click()
    await expect(page.getByRole('dialog')).toContainText('Войдите, чтобы продолжить')
    await expect.poll(() => new URL(page.url()).pathname).toBe('/feed')
  })

  test('точка «есть новое» не является подсветкой выбранного раздела', async ({ page }) => {
    await page.addInitScript(() => window.sessionStorage.setItem('lastSeenFeed:fresh', '2000-01-01T00:00:00.000Z'))
    await page.goto('/popular')
    const nav = page.getByRole('navigation', { name: 'Навигация' })
    const fresh = nav.getByRole('link', { name: /Свежее/ })
    await expect(nav.getByRole('link', { name: 'Популярное' })).toHaveAttribute('aria-current', 'page')
    await expect(fresh).not.toHaveAttribute('aria-current', 'page')
    await expect(fresh.getByRole('img', { name: 'Есть новое' })).toBeVisible()
  })
})
