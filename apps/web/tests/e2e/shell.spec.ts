import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

const WIDE = 1200

const GUEST_SECTIONS = [
  '/',
  '/popular',
  '/feed',
  '/t/tehnologii',
  '/p/statya-1',
  '/u/reader',
  '/u/reader/followers',
  '/u/reader/following',
  '/messages',
  '/rating',
  '/bookmarks',
  '/search',
  '/about',
]

function isWide(page: Page): boolean {
  return (page.viewportSize()?.width ?? 0) >= WIDE
}

async function clientNavigate(page: Page, path: string): Promise<void> {
  await page.evaluate((next) => {
    const current = window.history.state as { idx?: number } | null
    const idx = typeof current?.idx === 'number' ? current.idx + 1 : 1
    const key = Math.random().toString(36).slice(2, 10)
    window.history.pushState({ usr: null, key, idx }, '', next)
    window.dispatchEvent(new PopStateEvent('popstate'))
  }, path)
  await expect.poll(() => new URL(page.url()).pathname).toBe(path)
}

async function expectFrame(page: Page): Promise<void> {
  await expect(page.getByRole('banner')).toBeVisible()
  await expect(page.getByRole('navigation', { name: 'Навигация' })).toBeVisible()
  await expect(page.getByRole('main')).toBeVisible()
  await expect(page.getByRole('complementary', { name: 'Популярные комментарии' })).toBeVisible()
}

test.describe('Каркас на всех разделах', () => {
  test.beforeEach(({ page }) => {
    test.skip(!isWide(page), 'Три колонки проверяются от 1200px')
  })

  test('гость проходит публичные адреса, шапка не размонтируется', async ({ page }) => {
    await page.goto('/')
    await expectFrame(page)
    const mount_id = await page.getByRole('banner').getAttribute('data-mount-id')
    expect(mount_id).toBeTruthy()
    for (const path of GUEST_SECTIONS) {
      await clientNavigate(page, path)
      await expectFrame(page)
      await expect(page.getByRole('banner')).toHaveAttribute('data-mount-id', mount_id ?? '')
    }
  })

  test('участник открывает редактор в том же каркасе', async ({ page }) => {
    await page.addInitScript(() => window.localStorage.setItem('mock_viewer', 'member'))
    await page.goto('/')
    const mount_id = await page.getByRole('banner').getAttribute('data-mount-id')
    for (const path of ['/write', '/write/11111111-1111-4111-8111-111111111111']) {
      await clientNavigate(page, path)
      await expectFrame(page)
      await expect(page.getByRole('banner')).toHaveAttribute('data-mount-id', mount_id ?? '')
    }
  })

  test('суперадминистратор открывает разделы площадки в том же каркасе', async ({ page }) => {
    await page.addInitScript(() => window.localStorage.setItem('mock_viewer', 'superadmin'))
    await page.goto('/')
    const mount_id = await page.getByRole('banner').getAttribute('data-mount-id')
    for (const path of ['/admin/moderation', '/admin/topics', '/admin/settings']) {
      await clientNavigate(page, path)
      await expectFrame(page)
      await expect(page.getByRole('banner')).toHaveAttribute('data-mount-id', mount_id ?? '')
    }
  })

  test('пустая правая карточка остаётся и не отдаёт ширину центру', async ({ page }) => {
    await page.addInitScript(() => window.localStorage.setItem('mock_rail', 'empty'))
    await page.goto('/')
    const rail = page.getByRole('complementary', { name: 'Популярные комментарии' })
    await expect(rail.getByText('Пока нечего показать')).toBeVisible()
    const rail_box = await rail.boundingBox()
    const main_box = await page.getByRole('main').boundingBox()
    expect(rail_box?.width ?? 0).toBeGreaterThan(200)
    expect((main_box?.x ?? 0) + (main_box?.width ?? 0)).toBeLessThanOrEqual((rail_box?.x ?? 0) + 8)
  })

  test('ошибка популярных комментариев остаётся в правой карточке', async ({ page }) => {
    await page.addInitScript(() => window.localStorage.setItem('mock_rail', 'error'))
    await page.goto('/')
    const rail = page.getByRole('complementary', { name: 'Популярные комментарии' })
    await expect(rail.getByRole('alert')).toContainText('Не удалось загрузить комментарии', { timeout: 15_000 })
    await expect(rail.getByRole('button', { name: 'Повторить' })).toBeVisible()
    await expect(page.getByRole('navigation', { name: 'Навигация' }).getByRole('link', { name: 'Технологии' })).toBeVisible()
    await expect(page.getByRole('main').getByRole('article').first()).toBeVisible()
    await expect(page.getByRole('main').getByRole('alert')).toHaveCount(0)
  })

  test('длинный список тем прокручивается внутри левой карточки', async ({ page }) => {
    await page.addInitScript(() => window.localStorage.setItem('mock_topics', 'long'))
    await page.goto('/')
    const scroller = page.locator('[data-shell-scroll="left"]')
    await expect(scroller.getByText('Длинная тема 1')).toBeVisible()
    await scroller.getByRole('button', { name: 'Показать все' }).click()
    await expect(scroller.getByText('Длинная тема 20')).toBeAttached()
    const banner = page.getByRole('banner')
    const before = await banner.boundingBox()
    await scroller.evaluate((element) => {
      element.scrollTop = element.scrollHeight
    })
    await expect.poll(async () => scroller.evaluate((element) => element.scrollTop)).toBeGreaterThan(40)
    expect(await banner.boundingBox()).toEqual(before)
  })

  test('«Наверх» возвращает длинную статью к началу', async ({ page }) => {
    await page.addInitScript(() => window.localStorage.setItem('mock_article_length', 'long'))
    await page.goto('/p/statya-1')
    const main = page.getByRole('main')
    await expect(main.getByText(/Абзац 40/)).toBeAttached()
    await main.evaluate((element) => {
      element.scrollTop = 900
    })
    const back = page.getByRole('button', { name: 'Наверх' })
    await expect(back).toBeVisible()
    await back.click()
    await expect.poll(async () => main.evaluate((element) => element.scrollTop), { timeout: 5_000 }).toBeLessThan(8)
  })

  test('диалог входа не меняет адрес и оставляет обе карточки', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('banner').getByRole('button', { name: 'Войти' }).click()
    await expect(page.getByRole('dialog')).toContainText('Войдите, чтобы продолжить')
    await expect.poll(() => new URL(page.url()).pathname).toBe('/')
    await page.getByRole('dialog').getByRole('button', { name: 'Закрыть' }).click()
    await expect(page.getByRole('dialog')).toBeHidden()
    await expectFrame(page)
    await expect.poll(() => new URL(page.url()).pathname).toBe('/')
  })

  test('прямая ссылка на профиль показывает карточки до ответа центра', async ({ page }) => {
    await page.addInitScript(() => window.localStorage.setItem('mock_profile_delay', '1'))
    await page.goto('/u/reader')
    const name = page.getByRole('main').getByRole('heading', { name: 'Роман Читаев' })
    await expectFrame(page)
    await expect(name).toHaveCount(0)
    await expect(name).toBeVisible({ timeout: 8_000 })
  })
})
