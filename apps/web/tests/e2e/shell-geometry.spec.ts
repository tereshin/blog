import { expect as base_expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

const expect = base_expect.configure({ timeout: 20_000 })

const RAIL_NAME = 'Популярные комментарии'
const NAV_NAME = 'Навигация'

function expectNear(actual: number, expected: number, tolerance = 1.5): void {
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(tolerance)
}

async function expectSearchBeforeNotifications(page: Page): Promise<void> {
  const labels = await page.getByRole('banner').getByRole('button').evaluateAll((nodes) => nodes.map((node) => node.getAttribute('aria-label')))
  const search_index = labels.indexOf('Поиск')
  const notes_index = labels.indexOf('Уведомления')
  expect(search_index).toBeGreaterThanOrEqual(0)
  expect(notes_index).toBe(search_index + 1)
}

async function columnPlacement(page: Page): Promise<{ display: string; below: boolean; width: number }> {
  return page.evaluate(() => {
    const aside = document.querySelector('aside')
    const main = document.querySelector('main')
    if (!aside || !main) return { display: 'missing', below: false, width: 0 }
    const style = getComputedStyle(aside)
    const aside_box = aside.getBoundingClientRect()
    const main_box = main.getBoundingClientRect()
    const below = style.display !== 'none' && aside_box.top >= main_box.bottom - 1
    return { display: style.display, below, width: aside_box.width }
  })
}

test.describe('геометрия каркаса', () => {
  test.describe.configure({ timeout: 90_000 })

  test('на 1440 полоса 1280 по центру, столбцы и шапка держат числа', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/')
    const banner = page.getByRole('banner')
    const nav = page.getByRole('navigation', { name: NAV_NAME })
    const rail = page.getByRole('complementary', { name: RAIL_NAME })
    const main = page.getByRole('main')
    await expect(banner).toBeVisible()
    await expect(nav).toBeVisible()
    await expect(rail).toBeVisible()
    await expect(main.getByRole('article').first()).toBeVisible()

    const banner_box = await banner.boundingBox()
    const nav_box = await nav.boundingBox()
    const rail_box = await rail.boundingBox()
    const main_box = await main.boundingBox()
    expect(banner_box).not.toBeNull()
    expect(nav_box).not.toBeNull()
    expect(rail_box).not.toBeNull()
    expect(main_box).not.toBeNull()
    if (!banner_box || !nav_box || !rail_box || !main_box) return

    expectNear(banner_box.y, 0)
    expectNear(banner_box.height, 56)
    expectNear(nav_box.width, 220)
    expectNear(rail_box.width, 320)
    expectNear(main_box.x - (nav_box.x + nav_box.width), 16)
    expectNear(rail_box.x - (main_box.x + main_box.width), 16)
    expectNear(main_box.width, 708)
    expectNear(rail_box.x + rail_box.width - nav_box.x, 1280)
    expectNear(nav_box.x, (1440 - 1280) / 2)

    const sticky = await nav.evaluate((element) => {
      const style = getComputedStyle(element)
      return { position: style.position, top: style.top, overflow_y: style.overflowY, align_self: style.alignSelf, max_height: Number.parseFloat(style.maxHeight) }
    })
    expect(sticky.position).toBe('sticky')
    expect(sticky.top).toBe('56px')
    expect(sticky.overflow_y).toBe('auto')
    expect(['start', 'flex-start']).toContain(sticky.align_self)
    expectNear(sticky.max_height, 900 - 56, 2)
    await expect(page.locator('[data-shell-scroll="center"]')).toHaveCount(0)
    await expectSearchBeforeNotifications(page)
    await expect(page.getByRole('banner').locator('[aria-label="Открыть навигацию"]')).toBeHidden()
    await expect(page.getByText('Подписка Plus')).toHaveCount(0)
  })

  test('прокрутка статьи двигает документ, шапка и столбцы остаются, «Наверх» возвращает в начало', async ({ page }) => {
    await page.addInitScript(() => window.localStorage.setItem('mock_article_length', 'long'))
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/p/statya-1')
    const banner = page.getByRole('banner')
    const nav = page.getByRole('navigation', { name: NAV_NAME })
    const rail = page.getByRole('complementary', { name: RAIL_NAME })
    const paragraph = page.getByText(/^Абзац 1\./)
    await expect(paragraph).toBeVisible()
    await expect(page.getByText(/Абзац 40/)).toBeAttached()
    await expect(page.locator('[data-shell-scroll="center"]')).toHaveCount(0)

    const title = banner.locator('span.truncate')
    await expect(title).toContainText(/Статья 1:/)
    const truncated = await title.evaluate((element) => {
      const original = element.textContent
      element.textContent = 'Очень длинное название раздела, которое не помещается в одну строку шапки и должно обрезаться многоточием на краю'
      const style = getComputedStyle(element)
      const header = element.closest('[role="banner"]')
      const result = {
        white_space: style.whiteSpace,
        text_overflow: style.textOverflow,
        lines: element.getClientRects().length,
        clipped: element.scrollWidth > element.clientWidth + 1,
        header_height: header?.getBoundingClientRect().height ?? 0,
      }
      element.textContent = original
      return result
    })
    expect(truncated.white_space).toBe('nowrap')
    expect(truncated.text_overflow).toBe('ellipsis')
    expect(truncated.lines).toBe(1)
    expect(truncated.clipped).toBe(true)
    expectNear(truncated.header_height, 56)

    const before = {
      banner: await banner.boundingBox(),
      nav: await nav.boundingBox(),
      rail: await rail.boundingBox(),
      paragraph: await paragraph.boundingBox(),
    }
    await page.evaluate(() => window.scrollTo(0, 900))
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(400)
    const after_paragraph = await paragraph.boundingBox()
    const after_banner = await banner.boundingBox()
    const after_nav = await nav.boundingBox()
    const after_rail = await rail.boundingBox()
    expect((after_paragraph?.y ?? 0)).toBeLessThan((before.paragraph?.y ?? 0) - 200)
    expectNear(after_banner?.y ?? -1, before.banner?.y ?? 0)
    expectNear(after_nav?.y ?? -1, before.nav?.y ?? 0)
    expectNear(after_rail?.y ?? -1, before.rail?.y ?? 0)
    await expect(nav).toBeVisible()
    await expect(rail).toBeVisible()

    const back = page.getByRole('button', { name: 'Наверх' })
    await expect(back).toBeVisible()
    await back.click()
    await expect.poll(() => page.evaluate(() => window.scrollY), { timeout: 5_000 }).toBeLessThan(8)
    await expect(nav).toBeVisible()
    await expect(rail).toBeVisible()
    await expect(page.getByText('Подписка Plus')).toHaveCount(0)
  })

  test('ровно 1280px — три столбца', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/')
    const nav = page.getByRole('navigation', { name: NAV_NAME })
    const rail = page.getByRole('complementary', { name: RAIL_NAME })
    const main = page.getByRole('main')
    await expect(nav).toBeVisible()
    await expect(rail).toBeVisible()
    await expect(main.getByRole('article').first()).toBeVisible()
    const nav_box = await nav.boundingBox()
    const rail_box = await rail.boundingBox()
    const main_box = await main.boundingBox()
    expectNear(nav_box?.width ?? 0, 220)
    expectNear(rail_box?.width ?? 0, 320)
    expectNear((main_box?.x ?? 0) - ((nav_box?.x ?? 0) + (nav_box?.width ?? 0)), 16)
    expectNear((rail_box?.x ?? 0) - ((main_box?.x ?? 0) + (main_box?.width ?? 0)), 16)
    expectNear(main_box?.width ?? 0, 708)
    await expect(page.locator('[aria-label="Открыть навигацию"]')).toBeHidden()
    await expectSearchBeforeNotifications(page)
  })

  test('на 1279px правого столбца нет, обсуждение статьи остаётся в центре', async ({ page }) => {
    await page.addInitScript(() => window.localStorage.setItem('mock_article_length', 'long'))
    await page.setViewportSize({ width: 1279, height: 800 })
    await page.goto('/p/statya-1')
    const main = page.getByRole('main')
    const title = main.getByRole('heading', { level: 1 })
    const field = main.getByRole('textbox', { name: 'Написать комментарий' })
    await expect(title).toBeVisible()
    await expect(field).toBeVisible()
    await expect(page.getByRole('complementary', { name: RAIL_NAME })).toHaveCount(0)
    const placement = await columnPlacement(page)
    expect(placement.display).toBe('none')
    expect(placement.below).toBe(false)

    const before_title = await title.boundingBox()
    const before_field = await field.boundingBox()
    await page.evaluate(() => window.scrollTo(0, 400))
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(100)
    const after_title = await title.boundingBox()
    const after_field = await field.boundingBox()
    expectNear((after_field?.y ?? 0) - (after_title?.y ?? 0), (before_field?.y ?? 0) - (before_title?.y ?? 0), 2)
    expect((after_title?.y ?? 0)).toBeLessThan((before_title?.y ?? 0) - 50)
    await expect(page.getByRole('navigation', { name: NAV_NAME })).toBeVisible()
  })

  test('на 1024px левый столбец остаётся, правого нет на главной, в профиле и в настройках', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 800 })
    await page.goto('/')
    const nav = page.getByRole('navigation', { name: NAV_NAME })
    const main = page.getByRole('main')
    await expect(nav).toBeVisible()
    await expect(main.getByRole('article').first()).toBeVisible()
    await expect(page.getByRole('complementary', { name: RAIL_NAME })).toHaveCount(0)
    await expect(page.locator('[aria-label="Открыть навигацию"]')).toBeHidden()
    const nav_box = await nav.boundingBox()
    const main_box = await main.boundingBox()
    expectNear(nav_box?.width ?? 0, 220)
    expectNear((main_box?.x ?? 0) - ((nav_box?.x ?? 0) + (nav_box?.width ?? 0)), 16)
    expect((main_box?.x ?? 0) + (main_box?.width ?? 0)).toBeGreaterThan(1024 - 8)

    const before = await nav.boundingBox()
    await page.evaluate(() => window.scrollTo(0, 700))
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(200)
    const after = await nav.boundingBox()
    expectNear(after?.y ?? -1, before?.y ?? 0)
    expectNear(after?.width ?? 0, 220)
    await expectSearchBeforeNotifications(page)

    for (const path of ['/u/anna', '/admin/settings']) {
      await page.goto(path)
      await expect(page.getByRole('navigation', { name: NAV_NAME })).toBeVisible()
      await expect(page.getByRole('complementary', { name: RAIL_NAME })).toHaveCount(0)
      const placed = await columnPlacement(page)
      expect(placed.display).toBe('none')
      expect(placed.below).toBe(false)
    }
  })

  test('пустой правый столбец на 1024px не оставляет карточку под центром', async ({ page }) => {
    await page.addInitScript(() => window.localStorage.setItem('mock_rail', 'empty'))
    await page.setViewportSize({ width: 1024, height: 800 })
    await page.goto('/')
    await expect(page.getByRole('main').getByRole('article').first()).toBeVisible()
    await expect(page.getByText('Пока нечего показать')).toBeHidden()
    await expect(page.getByText('Подписка Plus')).toHaveCount(0)
    const placement = await columnPlacement(page)
    expect(placement.display).toBe('none')
    expect(placement.below).toBe(false)
    const main_box = await page.getByRole('main').boundingBox()
    expect((main_box?.x ?? 0) + (main_box?.width ?? 0)).toBeGreaterThan(1024 - 8)
  })

  test('на 390px одна колонка, одна кнопка шапки открывает навигацию', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    for (const path of ['/', '/p/statya-1', '/messages']) {
      await page.goto(path)
      const open = page.getByRole('banner').getByRole('button', { name: 'Открыть навигацию' })
      await expect(open).toBeVisible()
      await expect(open).toHaveAttribute('aria-controls', 'shell-nav')
      await expect(page.getByRole('complementary', { name: RAIL_NAME })).toHaveCount(0)
      await expect(page.getByRole('navigation', { name: NAV_NAME })).toHaveCount(0)
      await expectSearchBeforeNotifications(page)
      const main_box = await page.getByRole('main').boundingBox()
      expect(main_box?.width ?? 0).toBeGreaterThan(360)
      await open.click()
      await expect(page.getByRole('navigation', { name: NAV_NAME })).toBeVisible()
      await page.keyboard.press('Escape')
      await expect(page.getByRole('navigation', { name: NAV_NAME })).toHaveCount(0)
    }
    await expect(page.getByText('Подписка Plus')).toHaveCount(0)
  })

  test('прямой адрес статьи показывает столбцы ширины до текста', async ({ page }) => {
    await page.addInitScript(() => window.localStorage.setItem('mock_article_delay', 'hold'))
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/p/statya-1')
    await expect(page.getByRole('banner')).toBeVisible()
    await expect(page.getByRole('navigation', { name: NAV_NAME })).toBeVisible()
    await expect(page.getByRole('complementary', { name: RAIL_NAME })).toBeVisible()
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(0)
    await page.evaluate(() => window.localStorage.setItem('mock_article_delay', ''))
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

    await page.evaluate(() => window.localStorage.setItem('mock_article_delay', 'hold'))
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/p/statya-1')
    await expect(page.getByRole('banner')).toBeVisible()
    await expect(page.getByRole('complementary', { name: RAIL_NAME })).toHaveCount(0)
    const placement = await columnPlacement(page)
    expect(placement.display).toBe('none')
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(0)
  })
})
