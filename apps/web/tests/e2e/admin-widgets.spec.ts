import { expect, test } from '@playwright/test'

test('page editor saves a widget and article editor keeps it out of the toolbox', async ({
  page,
}) => {
  await page.addInitScript(() => window.localStorage.setItem('mock_viewer', 'superadmin'))
  await page.goto('/admin/pages/new')
  await expect(page.locator('[data-editor="ready"]')).toBeVisible()
  await page.getByRole('textbox', { name: 'Заголовок', exact: true }).fill('Виджеты')
  await page.getByLabel('Короткий адрес').fill('widget-feedback')
  await page.locator('.ce-paragraph').first().click()
  await page.locator('.ce-toolbar__plus').click()
  await page.locator('.ce-popover-item').filter({ hasText: 'Форма обратной связи' }).click()
  await page.getByLabel('Email получателя').fill('feedback@example.test')
  const response = page.waitForResponse(
    (res) => res.url().endsWith('/v1/admin/pages') && res.request().method() === 'POST',
  )
  await page.getByRole('button', { name: 'Сохранить черновик' }).click()
  const result = await response
  expect(result.status()).toBe(201)
  const draft = await result.json()
  const block = draft.blocks.blocks.find((item: { type: string }) => item.type === 'adminFeedback')
  expect(block.data.recipient).toBe('feedback@example.test')
  await page.getByRole('dialog').getByRole('button', { name: 'Закрыть', exact: true }).click()
  await page.getByRole('main').getByRole('link', { name: 'Виджеты', exact: true }).click()
  await expect(page).toHaveURL('/admin/pages/' + draft.id)
  await expect(page.getByLabel('Email получателя')).toHaveValue('feedback@example.test')
  await page.goto('/write')
  await expect(page.locator('[data-editor="ready"]')).toBeVisible()
  await page.locator('.ce-paragraph').first().click()
  await page.locator('.ce-toolbar__plus').click()
  await expect(
    page.locator('.ce-popover-item').filter({ hasText: 'Форма обратной связи' }),
  ).toHaveCount(0)
})
