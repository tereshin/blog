import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

const LEFT_COLUMN = 768

function hasLeftColumn(page: Page): boolean {
  return (page.viewportSize()?.width ?? 0) >= LEFT_COLUMN
}

test.use({ permissions: ['clipboard-read', 'clipboard-write'] })

test.describe('Жесты карточки', () => {
  test('подписка ставится и снимается, на своих карточках и профиле кнопки нет', async ({
    page,
  }) => {
    await page.addInitScript(() => window.localStorage.setItem('mock_viewer', 'member'))
    await page.goto('/')
    const card = page.getByRole('main').getByRole('article').first()
    await expect(card).toBeVisible({ timeout: 15_000 })
    await card.getByRole('button', { name: 'Подписаться' }).click()
    await expect(card.getByRole('button', { name: 'Вы подписаны' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await card.getByRole('button', { name: 'Вы подписаны' }).click()
    await expect(card.getByRole('button', { name: 'Подписаться' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )

    await page.addInitScript(() => window.localStorage.setItem('mock_viewer', 'author'))
    await page.goto('/')
    const own = page.getByRole('main').getByRole('article').first()
    await expect(own.getByRole('button', { name: 'Подписаться' })).toHaveCount(0)
    await expect(own.getByRole('button', { name: 'Вы подписаны' })).toHaveCount(0)
    await page.goto('/u/anna')
    await expect(page.getByRole('main').getByRole('button', { name: 'Подписаться' })).toHaveCount(0)
    await expect(page.getByRole('main').getByRole('button', { name: 'Вы подписаны' })).toHaveCount(
      0,
    )
  })

  test('закладка открывается из меню аватара, число совпадает, снятие убирает карточку', async ({
    page,
  }) => {
    await page.addInitScript(() => window.localStorage.setItem('mock_viewer', 'member'))
    await page.goto('/')
    const card = page.getByRole('main').getByRole('article').first()
    const title = (await card.getByRole('heading', { level: 2 }).innerText()).trim()
    await card.getByRole('button', { name: 'В закладки' }).click()
    const saved = card.getByRole('button', { name: 'Убрать из закладок' })
    await expect(saved).toBeVisible()
    const count = (await saved.innerText()).trim()
    await page.getByRole('button', { name: 'Меню учётной записи' }).click()
    await page.getByRole('menuitem', { name: 'Закладки' }).click()
    await expect(page).toHaveURL(/\/bookmarks$/)
    const saved_card = page.getByRole('main').getByRole('article').filter({ hasText: title })
    await expect(saved_card).toBeVisible()
    await expect(saved_card.getByRole('button', { name: 'Убрать из закладок' })).toContainText(
      count,
    )
    if (hasLeftColumn(page)) {
      await expect(
        page.getByRole('navigation', { name: 'Навигация' }).locator('[aria-current="page"]'),
      ).toHaveCount(0)
    }
    await saved_card.getByRole('button', { name: 'Убрать из закладок' }).click()
    await expect(page.getByRole('main').getByText('Закладок пока нет')).toBeVisible()
  })

  test('гость на закладках видит просьбу войти', async ({ page }) => {
    await page.goto('/bookmarks')
    await expect(page.getByRole('main').getByText('Войдите, чтобы видеть закладки')).toBeVisible({
      timeout: 15_000,
    })
    await expect(page.getByRole('main').getByRole('button', { name: 'Войти' })).toBeVisible()
  })

  test('поделиться копирует адрес статьи', async ({ page }) => {
    await page.goto('/')
    const card = page.getByRole('main').getByRole('article').first()
    await card.getByRole('button', { name: 'Поделиться' }).click()
    await expect(page.getByText('Ссылка скопирована')).toBeVisible()
    const copied = await page.evaluate(() => navigator.clipboard.readText())
    expect(copied).toBe(`${new URL(page.url()).origin}/p/statya-1`)
  })

  test('просмотренные прячутся при возврате, текст показывает, крестик убирает полосу', async ({
    page,
  }) => {
    await page.goto('/popular')
    const main = page.getByRole('main')
    const first = main.getByRole('article').nth(0)
    const second = main.getByRole('article').nth(1)
    const first_title = await first.getByRole('heading', { level: 2 }).innerText()
    const second_title = await second.getByRole('heading', { level: 2 }).innerText()
    const first_seen = page.waitForResponse(
      (response) =>
        response.url().includes('/v1/feed-seen') &&
        response.request().method() === 'PUT' &&
        response.ok(),
    )
    await first.getByRole('button', { name: 'Показать полностью' }).click()
    await expect(first.getByText('Полный текст статьи для проверки раскрытия.')).toBeVisible()
    await first_seen
    const second_seen = page.waitForResponse(
      (response) =>
        response.url().includes('/v1/feed-seen') &&
        response.request().method() === 'PUT' &&
        response.ok(),
    )
    await second.getByRole('button', { name: 'Показать полностью' }).click()
    await expect(second.getByText('Полный текст статьи для проверки раскрытия.')).toBeVisible()
    await second_seen
    await first.getByRole('heading', { level: 2 }).getByRole('link').click()
    await expect(page).toHaveURL(/\/p\/statya-\d+$/)
    await page.getByRole('banner').getByRole('link', { name: 'Назад' }).click()
    await expect(page).toHaveURL(/\/popular$/)
    const banner = main.getByRole('button', { name: 'Скрыто 2 просмотренных поста' })
    await expect(banner).toBeVisible()
    await expect(main.getByRole('heading', { name: first_title })).toHaveCount(0)
    await expect(main.getByRole('heading', { name: second_title })).toHaveCount(0)
    await banner.click()
    await expect(main.getByRole('heading', { name: first_title })).toBeVisible()
    await expect(main.getByRole('heading', { name: second_title })).toBeVisible()
    await main.getByRole('button', { name: 'Убрать полосу' }).click()
    await expect(banner).toHaveCount(0)
    await expect(main.getByRole('heading', { name: first_title })).toHaveCount(0)
    await expect(main.getByRole('heading', { name: second_title })).toHaveCount(0)
  })

  test('без просмотренных полосы нет и место под неё не занято', async ({ page }) => {
    await page.goto('/')
    const main = page.getByRole('main')
    const article = main.getByRole('article').first()
    await expect(article).toBeVisible()
    await expect(main.getByText(/Скрыт/)).toHaveCount(0)
    await expect(main.getByRole('button', { name: 'Убрать полосу' })).toHaveCount(0)
    const article_box = await article.boundingBox()
    const main_box = await main.boundingBox()
    expect(article_box && main_box && article_box.y - main_box.y).toBeLessThan(32)
  })

  test('меню чужой статьи копирует и жалуется, своей — правит и удаляет', async ({ page }) => {
    await page.addInitScript(() => window.localStorage.setItem('mock_viewer', 'member'))
    await page.goto('/')
    const foreign = page.getByRole('main').getByRole('article').first()
    await foreign.getByRole('button', { name: 'Действия со статьёй' }).click()
    await expect(page.getByRole('menuitem', { name: 'Копировать ссылку' })).toBeVisible()
    await page.getByRole('menuitem', { name: 'Пожаловаться' }).click()
    const dialog = page.getByRole('dialog', { name: 'Пожаловаться на статью' })
    await expect(dialog).toContainText('Жалоба попадёт к модераторам')
    await dialog.getByRole('button', { name: 'Пожаловаться' }).click()
    await expect(page.getByText('Жалоба отправлена')).toBeVisible()

    await page.addInitScript(() => window.localStorage.setItem('mock_viewer', 'author'))
    await page.goto('/')
    const own = page.getByRole('main').getByRole('article').first()
    await own.getByRole('button', { name: 'Действия со статьёй' }).click()
    await expect(page.getByRole('menuitem', { name: 'Редактировать' })).toBeVisible()
    await expect(page.getByRole('menuitem', { name: 'Удалить' })).toBeVisible()
    await expect(page.getByRole('menuitem', { name: 'Пожаловаться' })).toHaveCount(0)
  })

  test('в своей статье нет покупки показов', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('mock_viewer', 'author')
      window.localStorage.setItem('mock_article', 'own')
    })
    await page.goto('/p/statya-1')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Купить показы' })).toHaveCount(0)
    await expect(page.getByText('Ваш пост может собрать больше охватов')).toHaveCount(0)
  })
})

test('быстрая реакция и заполненная закладка в карточке', async ({ page }, testInfo) => {
  await page.addInitScript(() => localStorage.setItem('mock_viewer', 'member'))
  await page.goto('/')
  const card = page.getByRole('main').getByRole('article').first()
  const quick = card.getByRole('button', { name: 'Смех', exact: true })
  await expect(quick).toBeVisible()
  const sizes = await quick.evaluate((element) => {
    const css = getComputedStyle(element)
    return { height: css.height, left: css.paddingLeft, right: css.paddingRight }
  })
  expect(sizes).toEqual({ height: '30px', left: '8px', right: '8px' })
  await quick.click()
  await expect(card.getByRole('button', { name: 'Смех 1' })).toHaveAttribute('aria-pressed', 'true')
  const bookmark = card.getByRole('button', { name: 'В закладки', exact: true })
  const outline = await bookmark.locator('svg path').getAttribute('d')
  expect(outline).toContain('M7 4')
  await bookmark.click()
  const saved = card.getByRole('button', { name: 'Убрать из закладок', exact: true })
  const fill = await saved.locator('svg path').getAttribute('d')
  expect(fill).not.toBe(outline)
  await saved.hover()
  await card.screenshot({ path: testInfo.outputPath('card-actions.png') })
})
