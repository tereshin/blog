import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import type { Locator } from '@playwright/test'

function statistic(dialog: Locator, label: string) {
  return dialog.locator('dl > div').filter({ hasText: label }).getByRole('definition')
}

test('гость открывает статистику в карточке и статье, закрывает окно и возвращается к счётчику', async ({ page }, test_info) => {
  const view_requests: string[] = []
  page.on('request', (request) => {
    if (request.method() === 'POST' && request.url().endsWith('/views')) view_requests.push(request.url())
  })
  await page.goto('/')
  const card = page.getByRole('main').getByRole('article').nth(1)
  const trigger = card.getByRole('button', { name: '431 просмотр. Открыть статистику статьи' })
  await trigger.focus()
  await page.keyboard.press('Enter')
  const dialog = page.getByRole('dialog', { name: 'Статистика статьи', exact: true })
  await expect(dialog).toBeVisible()
  await expect(page).toHaveURL(/\/$/)
  await expect(dialog.getByRole('heading')).toHaveText('446 взаимодействий')
  for (const [label, count] of [['Просмотры', '431'], ['Реакции', '3'], ['Комментарии', '5'], ['Закладки', '7']] as const) {
    await expect(statistic(dialog, label)).toHaveText(count)
  }
  expect(view_requests).toHaveLength(0)
  const bounds = await dialog.boundingBox()
  const viewport = page.viewportSize()
  if (!bounds || !viewport) throw new Error('Окно статистики должно помещаться в экран')
  expect(bounds.x).toBeGreaterThanOrEqual(0)
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(viewport.width)
  await page.screenshot({ path: test_info.outputPath('article-statistics.png') })
  const accessibility = await new AxeBuilder({ page }).include('[role="dialog"]').analyze()
  expect(accessibility.violations).toEqual([])

  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(trigger).toBeFocused()
  await trigger.click()
  await dialog.getByRole('button', { name: 'Закрыть', exact: true }).click()
  await expect(dialog).toBeHidden()
  await expect(trigger).toBeFocused()

  await card.getByRole('heading').getByRole('link').click()
  await expect(page).toHaveURL(/\/p\/statya-2$/)
  const article_trigger = page.getByRole('main').getByRole('button', { name: '432 просмотра. Открыть статистику статьи' })
  await expect(article_trigger).toBeVisible()
  await article_trigger.click()
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('heading')).toHaveText('447 взаимодействий')
  await expect(statistic(dialog, 'Просмотры')).toHaveText('432')
  expect(view_requests).toHaveLength(1)
  await page.mouse.click(4, 4)
  await expect(dialog).toBeHidden()
  await expect(article_trigger).toBeFocused()
})

test('статистика учитывает новые реакции и закладки при повторном открытии', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('mock_viewer', 'member'))
  await page.goto('/')
  const card = page.getByRole('main').getByRole('article').first()
  const trigger = card.getByRole('button', { name: /Открыть статистику статьи/ })
  const dialog = page.getByRole('dialog', { name: 'Статистика статьи', exact: true })
  await trigger.click()
  for (const label of ['Реакции', 'Комментарии', 'Закладки']) {
    await expect(statistic(dialog, label)).toHaveText('0')
  }
  await page.keyboard.press('Escape')
  await card.getByRole('button', { name: 'Сердце', exact: true }).click()
  await expect(card.getByRole('button', { name: 'Сердце 1', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await card.getByRole('button', { name: 'В закладки', exact: true }).click()
  await expect(card.getByRole('button', { name: 'Убрать из закладок', exact: true })).toBeVisible()
  await trigger.click()
  await expect(statistic(dialog, 'Реакции')).toHaveText('1')
  await expect(statistic(dialog, 'Закладки')).toHaveText('1')
  await expect(dialog.getByRole('heading')).toHaveText('122 взаимодействия')
})
