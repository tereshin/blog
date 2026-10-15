import { expect, test } from '@playwright/test'

const FIRST_ID = '44444444-4444-4444-8444-000000000001'
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('mock_viewer', 'member')
    const icons = Array.from({ length: 25 }, (_, i) => ({
      id: `44444444-4444-4444-8444-${String(i + 1).padStart(12, '0')}`,
      label: `Статус ${i + 1}`,
      image_url: `${location.origin}/badges/one_year.svg`,
    }))
    sessionStorage.setItem('mock_site', JSON.stringify({ settings: { profile_status_icons: icons }, topics: [] }))
  })
})

test('сетка статусов имеет пять колонок, прокручивается и управляется клавиатурой', async ({ page }, testInfo) => {
  await page.goto('/u/reader')
  const trigger = page.getByRole('button', { name: 'Выбрать статус', exact: true })
  await trigger.press('Enter')
  const grid = page.getByRole('listbox', { name: 'Выбрать статус' })
  await expect(grid).toBeVisible()
  expect(await grid.evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(' ').length)).toBe(5)
  expect(await grid.evaluate((element) => element.scrollHeight > element.clientHeight)).toBe(true)
  await expect(page.getByRole('option', { name: 'Без статуса', exact: true })).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByRole('option', { name: 'Без статуса', exact: true })).toBeFocused()
  await page.keyboard.press('ArrowRight')
  await expect(page.getByRole('option', { name: 'Статус 1', exact: true })).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(grid).toHaveCount(0)
  await expect(trigger.getByRole('img', { name: 'Статус 1', exact: true })).toBeVisible()
  await trigger.click()
  await expect(page.getByRole('option', { name: 'Статус 1', exact: true })).toHaveAttribute('aria-selected', 'true')
  await page.getByRole('option', { name: 'Статус 25', exact: true }).scrollIntoViewIfNeeded()
  await grid.screenshot({ path: testInfo.outputPath('status-grid.png') })
  await page.keyboard.press('Escape')
  await expect(trigger).toBeFocused()
})

test('ошибка сохранения оставляет прежний статус и позволяет повторить выбор', async ({ page }) => {
  await page.goto('/u/reader')
  const trigger = page.getByRole('button', { name: 'Выбрать статус', exact: true })
  await expect(trigger).toBeVisible()
  await page.evaluate(() => {
    const original_fetch = window.fetch.bind(window)
    let fail = true
    window.fetch = async (input, init) => {
      const url = new URL(input instanceof Request ? input.url : String(input), location.href)
      if (url.pathname.endsWith('/v1/profiles/me') && fail) {
        fail = false
        return Response.json({ code: 'internal', title: 'Test failure' }, { status: 500 })
      }
      return original_fetch(input, init)
    }
  })
  await trigger.click()
  await page.getByRole('option', { name: 'Статус 1', exact: true }).click()
  await expect(page.getByRole('main').getByRole('alert')).toBeVisible()
  await expect(trigger.getByRole('img')).toHaveCount(0)
  await trigger.click()
  const request = page.waitForRequest((request) => request.url().endsWith('/v1/profiles/me') && request.method() === 'PUT')
  await page.getByRole('option', { name: 'Статус 1', exact: true }).click()
  expect((await request).postDataJSON()).toEqual({ status_icon_id: FIRST_ID })
  await expect(trigger.getByRole('img', { name: 'Статус 1', exact: true })).toBeVisible()
})

test('во время сохранения повторный выбор заблокирован', async ({ page }) => {
  await page.goto('/u/reader')
  const trigger = page.getByRole('button', { name: 'Выбрать статус', exact: true })
  await expect(trigger).toBeVisible()
  await page.evaluate(() => {
    const original_fetch = window.fetch.bind(window)
    window.fetch = async (input, init) => {
      const url = new URL(input instanceof Request ? input.url : String(input), location.href)
      if (url.pathname.endsWith('/v1/profiles/me')) {
        await new Promise<void>((resolve) => {
          (window as Window & { releaseProfileSave?: () => void }).releaseProfileSave = resolve
        })
      }
      return original_fetch(input, init)
    }
  })
  await trigger.click()
  await page.getByRole('option', { name: 'Статус 1', exact: true }).click()
  await expect(trigger).toBeDisabled()
  await expect.poll(() => page.evaluate(() => typeof (window as Window & { releaseProfileSave?: () => void }).releaseProfileSave)).toBe('function')
  await page.evaluate(() => (window as Window & { releaseProfileSave?: () => void }).releaseProfileSave?.())
  await expect(trigger).toBeEnabled()
  await expect(trigger.getByRole('img', { name: 'Статус 1', exact: true })).toBeVisible()
})
