import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

const base_url = process.env['E2E_BASE_URL']
if (base_url) test.use({ baseURL: base_url })

const TITLE = 'Первая заметка'
const RENAMED = 'Совсем другой заголовок'
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64')

async function openToolbox(page: Page, name: string) {
  await page.locator('.ce-paragraph, .cdx-list, .ce-block').last().click()
  await page.locator('.ce-toolbar__plus').click()
  await page.locator('.ce-popover-item').filter({ hasText: name }).click()
}

test.describe('Редактор статьи', () => {
  test('автор пишет, прячет черновик и публикует, не меняя адрес', async ({ page }) => {
    test.setTimeout(120_000)
    await page.addInitScript(() => window.localStorage.setItem('mock_viewer', 'member'))
    await page.goto('/')
    await page.getByRole('button', { name: 'Написать' }).click()
    await expect(page).toHaveURL(/\/write$/)
    await expect(page.locator('[data-editor="ready"]')).toBeVisible()

    await page.getByLabel('Заголовок').fill(TITLE)
    await page.locator('.ce-paragraph').first().click()
    await page.keyboard.type('Текст про телескоп')
    await openToolbox(page, 'Unordered List')
    await page.keyboard.type('Пункт один')
    await openToolbox(page, 'Image')
    const chooser = page.waitForEvent('filechooser')
    await page.getByText('Select an Image').click()
    await (await chooser).setFiles({ name: 'photo.png', mimeType: 'image/png', buffer: PNG })
    await expect(page.locator('.image-tool__image-picture')).toBeVisible()
    await openToolbox(page, 'Table')
    await expect(page.locator('.tc-table, .codex-editor table')).toBeVisible()

    await page.getByRole('button', { name: 'Сохранить черновик' }).click()
    await expect(page).toHaveURL(/\/write\/[0-9a-f-]{36}$/)
    const write_url = page.url()

    await page.evaluate(() => window.localStorage.setItem('mock_viewer', 'guest'))
    await page.goto('/')
    await expect(page.getByRole('heading', { name: TITLE })).toHaveCount(0)
    await page.goto('/u/reader')
    await expect(page.getByRole('heading', { name: TITLE })).toHaveCount(0)

    await page.evaluate(() => window.localStorage.setItem('mock_viewer', 'member'))
    await page.goto(write_url)
    await expect(page.getByLabel('Заголовок')).toHaveValue(TITLE)
    await page.getByRole('button', { name: 'Опубликовать' }).click()
    await expect(page.getByText('Сохранено')).toBeVisible()
    await page.goto('/')
    const link = page.getByRole('link', { name: TITLE })
    await expect(link).toBeVisible()
    const href = await link.getAttribute('href')

    await page.goto(write_url)
    await page.getByLabel('Заголовок').fill(RENAMED)
    await page.getByRole('button', { name: 'Сохранить черновик' }).click()
    await expect(page.getByText('Сохранено')).toBeVisible()
    await page.goto('/')
    await expect(page.getByRole('link', { name: RENAMED })).toHaveAttribute('href', href ?? '')

    await page.goto(write_url)
    await page.getByLabel('Заголовок').fill('Ещё не сохранено')
    await page.getByRole('link', { name: 'Блог' }).click()
    await expect(page.getByRole('heading', { name: 'Уйти без сохранения?' })).toBeVisible()
    await expect(page.getByRole('banner')).toBeVisible()
    await page.getByRole('button', { name: 'Остаться' }).click()
    await expect(page).toHaveURL(write_url)
    await expect(page.getByLabel('Заголовок')).toHaveValue('Ещё не сохранено')
  })

  test('гость и участник без права не попадают в редактор', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Написать' }).click()
    await expect(page.getByRole('heading', { name: 'Войдите, чтобы продолжить' })).toBeVisible()
    await page.goto('/write')
    await expect(page.getByText('Чтобы написать статью, войдите')).toBeVisible()

    await page.evaluate(() => window.localStorage.setItem('mock_viewer', 'no_publish'))
    await page.goto('/')
    await page.getByRole('button', { name: 'Написать' }).click()
    await expect(page.getByText('Публикация пока недоступна')).toBeVisible()
    await expect(page).toHaveURL(/\/$/)
    await page.goto('/write')
    await expect(page.getByText('Публикация пока недоступна')).toBeVisible()
  })
})
