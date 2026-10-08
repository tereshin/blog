import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

// Режим мока (VITE_API_MOCK=1): гость, 45 статей в ленте, постраничная подгрузка по 20.
const WIDE = 1200

function isWide(page: Page): boolean {
  return (page.viewportSize()?.width ?? 0) >= WIDE
}

test.describe('Лента «Свежее»: каркас и карточки', () => {
  test('гость на / видит шапку, навигацию, ленту от новых к старым и правую карточку', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('banner')).toBeVisible()
    if (isWide(page)) await expect(page.getByRole('navigation', { name: 'Навигация' })).toBeVisible()
    await expect(page.getByRole('complementary', { name: 'Популярные комментарии' })).toBeVisible()

    const main = page.getByRole('main')
    const cards = main.getByRole('article')
    await expect(cards.first()).toBeVisible()
    await expect(cards).toHaveCount(20)

    const times = await cards.locator('time').evaluateAll((nodes) => nodes.map((node) => Date.parse(node.getAttribute('datetime') ?? '')))
    expect(times.every((value) => !Number.isNaN(value))).toBe(true)
    expect(times).toEqual([...times].sort((a, b) => b - a))

    await expect(page.getByRole('complementary', { name: 'Популярные комментарии' }).getByRole('listitem').first()).toBeVisible()
  })

  test('в карточке чужой статьи элементы идут сверху вниз по порядку FR-060', async ({ page }) => {
    await page.goto('/')
    // Третья карточка: есть изображение и самый обсуждаемый комментарий.
    const card = page.getByRole('main').getByRole('article').nth(2)
    await expect(card).toBeVisible()
    const author = card.locator('a[href^="/u/"]').nth(1)
    const title = card.getByRole('heading', { level: 2 })
    const image = card.locator('img[loading="lazy"]').first()
    const comments = card.locator('a[href$="#comments"]').first()
    const peek = card.locator('a[href$="#comments"]').last()

    const ys = await Promise.all([author, title, image, comments, peek].map(async (locator) => (await locator.boundingBox())?.y ?? Number.NaN))
    expect(ys.every((value) => !Number.isNaN(value))).toBe(true)
    expect(ys).toEqual([...ys].sort((a, b) => a - b))
  })

  test('пилюля в центре шапки — ссылка на статью, а не поле ввода', async ({ page }) => {
    await page.goto('/')
    const banner = page.getByRole('banner')
    const pill = banner.locator('a[href^="/p/"]')
    await expect(pill).toBeVisible()
    await expect(banner.getByRole('textbox')).toHaveCount(0)
    await expect(banner.getByRole('searchbox')).toHaveCount(0)
  })

  test('прокрутка центра не двигает шапку и боковые карточки', async ({ page }) => {
    test.skip(!isWide(page), 'Боковые карточки закреплены только от 1200px')
    await page.goto('/')
    const main = page.getByRole('main')
    await expect(main.getByRole('article').first()).toBeVisible()

    const banner = page.getByRole('banner')
    const nav = page.getByRole('navigation', { name: 'Навигация' })
    const rail = page.getByRole('complementary', { name: 'Популярные комментарии' })
    const first_card = main.getByRole('article').first()
    const before = await Promise.all([banner.boundingBox(), nav.boundingBox(), rail.boundingBox(), first_card.boundingBox()])

    await main.hover()
    await page.mouse.wheel(0, 900)
    await expect.poll(async () => (await first_card.boundingBox())?.y ?? 0).toBeLessThan((before[3]?.y ?? 0) - 100)

    const after = await Promise.all([banner.boundingBox(), nav.boundingBox(), rail.boundingBox()])
    expect(after[0]).toEqual(before[0])
    expect(after[1]).toEqual(before[1])
    expect(after[2]).toEqual(before[2])
  })

  test('при прокрутке до конца подгружается следующая порция без дублей', async ({ page }) => {
    await page.goto('/')
    const cards = page.getByRole('main').getByRole('article')
    await expect(cards).toHaveCount(20)
    await cards.last().scrollIntoViewIfNeeded()
    await expect(cards).toHaveCount(40)
    const titles = await cards.getByRole('heading', { level: 2 }).allTextContents()
    expect(new Set(titles).size).toBe(titles.length)
  })

  test('пустая лента объясняет, что статей нет, а боковые карточки остаются на месте', async ({ page }) => {
    await page.addInitScript(() => window.localStorage.setItem('mock_feed', 'empty'))
    await page.goto('/')
    await expect(page.getByRole('main').getByText('Здесь пока нет статей')).toBeVisible()
    await expect(page.getByRole('main').getByRole('article')).toHaveCount(0)
    if (isWide(page)) await expect(page.getByRole('navigation', { name: 'Навигация' })).toBeVisible()
    await expect(page.getByRole('complementary', { name: 'Популярные комментарии' })).toBeVisible()
  })

  test('«Показать полностью» раскрывает остаток в карточке и не меняет адрес', async ({ page }) => {
    await page.goto('/')
    const card = page.getByRole('main').getByRole('article').first()
    await card.getByRole('button', { name: 'Показать полностью' }).click()
    await expect(card.getByText('Полный текст статьи для проверки раскрытия.')).toBeVisible()
    await expect(card.getByRole('button', { name: 'Свернуть' })).toBeVisible()
    await expect(page).toHaveURL(/\/$/)
    await card.getByRole('button', { name: 'Свернуть' }).click()
    await expect(card.getByText('Полный текст статьи для проверки раскрытия.')).toBeHidden()
  })

  test('участник ставит реакцию, повтор снимает, другой вид заменяет', async ({ page }) => {
    await page.addInitScript(() => window.localStorage.setItem('mock_viewer', 'member'))
    const states_ready = page.waitForResponse((response) => response.url().includes('/v1/me/article-states') && response.ok())
    await page.goto('/')
    await states_ready
    await expect(page.getByRole('banner').getByRole('button', { name: 'Меню учётной записи' })).toBeVisible()
    const card = page.getByRole('main').getByRole('article').first()
    await card.getByRole('button', { name: 'Добавить реакцию' }).click()
    await page.getByRole('menuitem', { name: 'Смех' }).click()
    const laugh = card.getByRole('button', { name: /Смех/ })
    await expect(laugh).toHaveAttribute('aria-pressed', 'true')
    await laugh.click()
    await expect(card.getByRole('button', { name: /Смех/ })).toHaveCount(0)
    await card.getByRole('button', { name: 'Добавить реакцию' }).click()
    await page.getByRole('menuitem', { name: 'Смех' }).click()
    await expect(card.getByRole('button', { name: /Смех/ })).toHaveAttribute('aria-pressed', 'true')
    await card.getByRole('button', { name: 'Добавить реакцию' }).click()
    await page.getByRole('menuitem', { name: 'Огонь' }).click()
    await expect(card.getByRole('button', { name: /Смех/ })).toHaveCount(0)
    await expect(card.getByRole('button', { name: /Огонь/ })).toHaveAttribute('aria-pressed', 'true')
  })

  test('гость при реакции и закладке видит диалог входа, числа не меняются', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('banner').getByRole('button', { name: 'Войти' })).toBeVisible()
    const card = page.getByRole('main').getByRole('article').first()
    const bookmark = card.getByRole('button', { name: 'В закладки' })
    const before = await bookmark.textContent()
    await card.getByRole('button', { name: 'Добавить реакцию' }).click()
    await expect(page.getByRole('dialog')).toContainText('Войдите, чтобы продолжить')
    await page.getByRole('dialog').getByRole('button', { name: 'Закрыть' }).click()
    await bookmark.click()
    await expect(page.getByRole('dialog')).toContainText('Войдите, чтобы продолжить')
    await expect(bookmark).toHaveText(before ?? '')
    await expect(card.getByRole('button', { name: /Смех|Сердце|Огонь|Палец/ })).toHaveCount(0)
  })

  test('фрагмент комментария открывает обсуждение статьи', async ({ page }) => {
    await page.goto('/')
    const card = page.getByRole('main').getByRole('article').nth(2)
    await card.getByRole('link', { name: 'Самый обсуждаемый комментарий' }).click()
    await expect(page).toHaveURL(/\/p\/statya-3#comments/)
  })

  test('ошибка ленты показывается в центре с повтором', async ({ page }) => {
    await page.addInitScript(() => window.localStorage.setItem('mock_feed', 'error'))
    await page.goto('/')
    await expect(page.getByRole('main').getByRole('alert')).toContainText('Не удалось загрузить ленту')
    await expect(page.getByRole('main').getByRole('button', { name: 'Повторить' })).toBeVisible()
    await expect(page.getByRole('complementary', { name: 'Популярные комментарии' })).toBeVisible()
  })
})
