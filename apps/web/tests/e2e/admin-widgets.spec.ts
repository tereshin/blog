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

test('superadmin saves a bare section with multiple widgets and removes the sidebar', async ({
  page,
}) => {
  test.skip((page.viewportSize()?.width ?? 0) < 1280)
  await page.addInitScript(() => window.localStorage.setItem('mock_viewer', 'superadmin'))
  await page.goto('/admin/sidebar')
  const main = page.getByRole('main')
  await main.getByRole('button', { name: 'Добавить секцию' }).click()
  await main.getByLabel('Заголовок', { exact: true }).last().fill('Еще комментарии')
  await main.getByLabel('Обернуть в Card').last().uncheck()
  await main.getByRole('button', { name: '+ Комментарии', exact: true }).last().click()
  await main.getByRole('button', { name: '+ Комментарии', exact: true }).last().click()
  await main
    .getByRole('button', { name: '+ Сворачиваемый список кнопок', exact: true })
    .last()
    .click()
  const links = main.getByRole('group', { name: 'Сворачиваемый список кнопок' })
  await links.getByLabel('Заголовок').fill('Ссылки')
  await links.getByLabel('Изначально раскрыт').uncheck()
  await links.getByRole('button', { name: 'Добавить кнопку' }).click()
  await links.getByLabel('Подпись').fill('Документация')
  await links.getByLabel('URL', { exact: true }).fill('https://example.test/docs')
  await main.getByRole('button', { name: 'Сохранить', exact: true }).click()
  await expect(main.getByRole('status')).toHaveText('Сохранено')
  const sidebar = page.getByRole('complementary', { name: 'Правый сайдбар' })
  await expect(sidebar.getByRole('heading', { name: 'Еще комментарии' })).toBeVisible()
  await expect(sidebar.locator('ul')).toHaveCount(3)
  const toggle = sidebar.getByRole('button', { name: 'Ссылки' })
  await expect(toggle).toHaveAttribute('aria-expanded', 'false')
  await toggle.focus()
  await toggle.press('Enter')
  await expect(sidebar.getByRole('link', { name: 'Документация' })).toHaveAttribute(
    'href',
    'https://example.test/docs',
  )
  // Section removal is the last button in each section.
  await main.getByRole('button', { name: 'Удалить', exact: true }).last().click()
  await main.getByRole('button', { name: 'Удалить', exact: true }).last().click()
  await main.getByRole('button', { name: 'Сохранить', exact: true }).click()
  await expect(sidebar).toHaveCount(0)
})
