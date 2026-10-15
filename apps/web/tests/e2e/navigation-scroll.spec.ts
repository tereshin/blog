import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

async function ready(page: Page) {
  await expect(page.getByRole('main').getByRole('article').first()).toBeVisible()
}
async function position(page: Page, top: number) {
  await page.evaluate((y) => window.scrollTo(0, y), top)
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(top)
}
function isNarrow(page: Page) {
  return (page.viewportSize()?.width ?? 0) < 768
}

async function menu(page: Page, name: string) {
  await page.getByRole('navigation', { name: 'Навигация', exact: true }).getByRole('link', { name, exact: true }).click()
}

test('переходы и повторный выбор раздела начинают сверху; reload не восстанавливает старую позицию', async ({ page }) => {
  test.skip(isNarrow(page), 'повторный выбор раздела есть в левой колонке от 768px')
  await page.goto('/')
  await ready(page)
  await position(page, 700)
  await menu(page, 'Популярное')
  await expect(page).toHaveURL('/popular')
  await ready(page)
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0)
  await position(page, 600)
  await menu(page, 'Популярное')
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0)
  await menu(page, 'Свежее')
  await ready(page)
  await page.evaluate(() => sessionStorage.setItem('feedReturn', JSON.stringify({ mode: 'fresh', feed_key: 'fresh', entry_key: history.state.key, scroll_top: 900 })))
  await page.reload()
  await ready(page)
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0)
  await expect.poll(() => page.evaluate(() => history.scrollRestoration)).toBe('manual')
})

for (const method of ['header', 'browser'] as const) {
  test(`возврат из статьи (${method}) восстанавливает позицию, затем меню сбрасывает её`, async ({ page }) => {
    await page.goto('/')
    await ready(page)
    const title = page.getByRole('main').getByRole('heading', { level: 2 }).nth(3).getByRole('link')
    await title.scrollIntoViewIfNeeded()
    const before = await page.evaluate(() => window.scrollY)
    expect(before).toBeGreaterThan(100)
    await title.click()
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    if (method === 'header') await page.getByRole('banner').getByRole('link', { name: 'Назад', exact: true }).click()
    else await page.goBack()
    await ready(page)
    await expect.poll(async () => Math.abs(await page.evaluate(() => window.scrollY) - before)).toBeLessThan(8)
    if (isNarrow(page)) {
      await page.getByRole('navigation', { name: 'Мобильная навигация' }).getByRole('link', { name: 'Обзор', exact: true }).click()
    } else {
      await menu(page, 'Свежее')
    }
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0)
  })
}

test('гостевая кнопка «Написать» скрыта только на мобильном; у участника доступна', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('mock_viewer', 'guest'))
  await page.goto('/')
  const banner = page.getByRole('banner')
  await expect(banner.getByRole('button', { name: 'Войти', exact: true })).toBeVisible()
  const write = banner.getByRole('button', { name: 'Написать', exact: true })
  if ((page.viewportSize()?.width ?? 0) < 768) await expect(write).toHaveCount(0)
  else await expect(write).toBeVisible()
  await page.addInitScript(() => localStorage.setItem('mock_viewer', 'member'))
  await page.reload()
  await expect(banner.getByRole('button', { name: 'Меню учётной записи', exact: true })).toBeVisible()
  await expect(write).toBeVisible()
  await banner.getByRole('button', { name: 'Меню учётной записи', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Выйти', exact: true }).click()
  await expect(banner.getByRole('button', { name: 'Войти', exact: true })).toBeVisible()
  if ((page.viewportSize()?.width ?? 0) < 768) await expect(write).toHaveCount(0)
  else await expect(write).toBeVisible()
})
