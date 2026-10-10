import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

async function openSearch(page: Page) {
  await page.getByRole('banner').getByRole('button', { name: 'Поиск', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Поиск', exact: true })
  const field = dialog.getByRole('textbox', { name: 'Поиск', exact: true })
  await expect(field).toBeFocused()
  return { dialog, field }
}

test.beforeEach(async ({ page }, test_info) => {
  if (test_info.project.name === 'wide-light') {
    await page.addInitScript(() => localStorage.setItem('appearance', 'light'))
  }
  await page.goto('/')
})

test('открытие, затемнение, фокус и три способа закрытия', async ({ page }) => {
  const trigger = page.getByRole('banner').getByRole('button', { name: 'Поиск', exact: true })
  const { dialog, field } = await openSearch(page)
  await expect(dialog.getByText('Запросов пока нет')).toBeVisible()
  const backdrop = page.locator('[data-slot="modal-backdrop"]')
  const background = await backdrop.evaluate((element) => getComputedStyle(element).backgroundColor)
  expect(background).toMatch(/0\.6|60%/)
  await field.press('Escape')
  await expect(dialog).toHaveCount(0)
  await expect(trigger).toBeFocused()
  await openSearch(page)
  await dialog.getByRole('button', { name: 'Закрыть', exact: true }).click()
  await expect(dialog).toHaveCount(0)
  await openSearch(page)
  await backdrop.click({ position: { x: 2, y: 300 } })
  await expect(dialog).toHaveCount(0)
  await expect(trigger).toBeFocused()
})

test('выдача обновляется при вводе; очистка и короткий запрос убирают результаты', async ({
  page,
}) => {
  const { dialog, field } = await openSearch(page)
  await field.fill('Анна')
  await expect(dialog.getByRole('link', { name: /Анна Авторова/ })).toBeVisible()
  await expect(page).toHaveURL(/\/$/)
  await field.fill('Технологии')
  await expect(
    dialog.getByRole('region', { name: 'Темы' }).getByRole('link', { name: /Технологии/ }),
  ).toBeVisible()
  await expect(dialog.getByRole('region', { name: 'Люди' })).toHaveCount(0)
  await field.fill('несуществующийзапрос')
  await expect(dialog.getByText('Ничего не нашлось')).toBeVisible()
  await field.fill('а')
  await expect(dialog.getByText('Введите хотя бы 2 символа')).toBeVisible()
  await expect(dialog.getByRole('link')).toHaveCount(0)
  await dialog.getByRole('button', { name: 'Очистить запрос' }).click()
  await expect(field).toHaveValue('')
  await expect(field).toBeFocused()
  await expect(dialog.getByText('Последние запросы')).toBeVisible()
})

test('статья открывается из подсказки, Escape возвращает заголовок статьи', async ({ page }) => {
  const { dialog, field } = await openSearch(page)
  await field.fill('компромиссов')
  const article = dialog.getByRole('link', { name: /без компромиссов/ }).first()
  await expect(article).toBeVisible()
  const href = await article.getAttribute('href')
  await article.click()
  await expect(page).toHaveURL(new RegExp(`${href}$`))
  await expect(dialog).toHaveCount(0)
  const title = page.getByRole('banner').locator('span.truncate')
  await expect(title).toContainText('без компромиссов')
  const reopened = await openSearch(page)
  await reopened.field.press('Escape')
  await expect(title).toContainText('без компромиссов')
})

test('кнопка всех результатов, Enter и история запросов', async ({ page }) => {
  const { dialog, field } = await openSearch(page)
  await field.fill('  компромиссов  ')
  await dialog.getByRole('button', { name: 'Перейти ко всем результатам' }).click()
  await expect.poll(() => new URL(page.url()).searchParams.get('q')).toBe('компромиссов')
  await expect(dialog).toHaveCount(0)
  await page.getByRole('banner').getByRole('link').first().click()
  await expect(page).toHaveURL(/\/$/)
  await expect(page.getByRole('main').getByRole('heading', { name: 'Статьи', exact: true })).toHaveCount(0)
  await openSearch(page)
  await expect(dialog.getByRole('button', { name: 'компромиссов', exact: true })).toBeVisible()
  await dialog.getByRole('button', { name: 'компромиссов', exact: true }).click()
  await expect(page).toHaveURL(/\/search\?q=/)
  await openSearch(page)
  await expect(field).toHaveValue('компромиссов')
  await field.fill('Анна')
  await field.press('Enter')
  await expect.poll(() => new URL(page.url()).searchParams.get('q')).toBe('Анна')
  await expect(dialog).toHaveCount(0)
  await expect(page.getByRole('main').getByRole('link', { name: 'Анна Авторова', exact: true }).first()).toBeVisible()
  await page.getByRole('banner').getByRole('link').first().click()
  await expect(page).toHaveURL(/\/$/)
  await expect(page.getByRole('main').getByRole('heading', { name: 'Люди', exact: true })).toHaveCount(0)
  await openSearch(page)
  await dialog.getByRole('button', { name: 'Очистить', exact: true }).click()
  await expect(dialog.getByText('Запросов пока нет')).toBeVisible()
})

test('загрузка не показывает старую выдачу, запоздалый ответ её не возвращает', async ({
  page,
}) => {
  await page.evaluate(() => {
    const original_fetch = window.fetch.bind(window)
    window.fetch = async (input, init) => {
      const url = new URL(input instanceof Request ? input.url : String(input), location.href)
      const response = await original_fetch(input, init)
      if (url.pathname.endsWith('/v1/search') && url.searchParams.get('q') === 'Анна') {
        await new Promise((resolve) => setTimeout(resolve, 800))
      }
      return response
    }
  })
  const { dialog, field } = await openSearch(page)
  const old_response = page.waitForResponse(
    (response) => new URL(response.url()).searchParams.get('q') === 'Анна',
  )
  await field.fill('Анна')
  await expect(dialog.getByRole('status', { name: 'Загрузка…' })).toBeVisible()
  await old_response
  // Новый запрос появляется, пока первый ещё ждёт ответ.
  await field.fill('Технологии')
  await expect(
    dialog.getByRole('region', { name: 'Темы' }).getByRole('link', { name: /Технологии/ }),
  ).toBeVisible()
  await expect(dialog.getByRole('region', { name: 'Люди' })).toHaveCount(0)
})

test('ошибка поиска позволяет повторить запрос', async ({ page }) => {
  await page.evaluate(() => {
    const original_fetch = window.fetch.bind(window)
    let should_fail = true
    window.fetch = async (input, init) => {
      const url = new URL(input instanceof Request ? input.url : String(input), location.href)
      if (url.pathname.endsWith('/v1/search') && should_fail) {
        should_fail = false
        return Response.json(
          { code: 'validation_failed', title: 'Search unavailable' },
          { status: 422 },
        )
      }
      return original_fetch(input, init)
    }
  })
  const { dialog, field } = await openSearch(page)
  await field.fill('Анна')
  await expect(dialog.getByRole('alert')).toContainText('Не удалось выполнить поиск')
  await dialog.getByRole('button', { name: 'Повторить' }).click()
  await expect(dialog.getByRole('link', { name: /Анна Авторова/ })).toBeVisible()
})

test('форма совпадает с колонкой; панель доступна и помещается в окне', async ({
  page,
}, test_info) => {
  const main_box = await page.getByRole('main').boundingBox()
  const { dialog, field } = await openSearch(page)
  await field.fill('Анна')
  await expect(dialog.getByRole('link', { name: /Анна Авторова/ })).toBeVisible()
  const form_box = await dialog.getByRole('search').boundingBox()
  const panel_box = await page.locator('#header-search-results').boundingBox()
  expect(form_box).not.toBeNull()
  expect(panel_box).not.toBeNull()
  if (!form_box || !panel_box || !main_box) return
  const viewport = page.viewportSize()
  expect(viewport).not.toBeNull()
  if (!viewport) return
  expect(Math.abs(form_box.x - panel_box.x)).toBeLessThanOrEqual(1)
  expect(Math.abs(form_box.width - panel_box.width)).toBeLessThanOrEqual(1)
  if (viewport.width >= 1280) {
    expect(Math.abs(form_box.x - main_box.x)).toBeLessThanOrEqual(1)
    expect(Math.abs(form_box.width - main_box.width)).toBeLessThanOrEqual(1)
  }
  expect(form_box.x).toBeGreaterThanOrEqual(0)
  expect(form_box.x + form_box.width).toBeLessThanOrEqual(viewport.width)
  expect(panel_box.y + panel_box.height).toBeLessThanOrEqual(viewport.height)
  const audit = await new AxeBuilder({ page }).include('[role="dialog"]').analyze()
  expect(audit.violations).toEqual([])
  await page.screenshot({ path: test_info.outputPath('header-search.png') })
  await field.press('Tab')
  await expect(dialog.getByRole('button', { name: 'Очистить запрос' })).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(dialog.getByRole('button', { name: 'Перейти ко всем результатам' })).toBeFocused()
})

test('планшет, широкий экран и низкое окно сохраняют доступ к результатам', async ({ page }) => {
  for (const width of [768, 1024, 1440, 1920]) {
    await page.setViewportSize({ width, height: 300 })
    const main_box = await page.getByRole('main').boundingBox()
    const { dialog, field } = await openSearch(page)
    await field.fill('компромиссов')
    await expect(dialog.getByRole('link').first()).toBeVisible()
    const form_box = await dialog.getByRole('search').boundingBox()
    const panel = page.locator('#header-search-results')
    const panel_box = await panel.boundingBox()
    expect(form_box).not.toBeNull()
    expect(panel_box).not.toBeNull()
    if (!form_box || !panel_box || !main_box) return
    expect(Math.abs(form_box.x - main_box.x)).toBeLessThanOrEqual(1)
    expect(panel_box.y + panel_box.height).toBeLessThanOrEqual(300)
    expect(await panel.evaluate((element) => element.scrollHeight > element.clientHeight)).toBe(
      true,
    )
    // Фокус на последнем результате прокручивает именно панель.
    await dialog.getByRole('link').last().focus()
    await expect(dialog.getByRole('link').last()).toBeInViewport()
    await field.press('Escape')
  }
})
