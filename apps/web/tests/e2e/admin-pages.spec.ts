import { expect, test } from '@playwright/test'

test('creates, previews, publishes, unpublishes and deletes a simple page', async ({ page }) => {
  test.skip(
    process.env['E2E_TARGET'] === 'local',
    'Local role flow is covered in the separate authenticated scenario',
  )
  await page.addInitScript(() => localStorage.setItem('mock_viewer', 'superadmin'))
  await page.goto('/admin')
  await page.getByRole('link', { name: /Страницы/ }).click()
  await page.getByRole('button', { name: 'Создать страницу' }).click()
  await expect(page.locator('[data-editor="ready"]')).toBeVisible()
  await page.locator('.article-editor-title').fill('Тестовая страница')
  await page.getByLabel('Короткий адрес').fill('test-simple-page')
  await page.locator('.ce-paragraph').first().fill('Содержание страницы')
  await page.getByRole('button', { name: 'Предпросмотр', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Тестовая страница', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Вернуться в редактор' }).click()
  await page.getByRole('button', { name: 'Сохранить черновик', exact: true }).click()
  await expect(page.getByText('Сохранено', { exact: true })).toBeVisible()
  await expect(page).toHaveURL(/\/admin\/pages\/new$/)
  await page.getByRole('button', { name: 'Опубликовать', exact: true }).click()
  await expect(
    page
      .getByRole('dialog', { name: 'Страницы', exact: true })
      .getByText('Опубликована', { exact: true }),
  ).toBeVisible()
  await expect(page.getByLabel('Короткий адрес')).toHaveAttribute('readonly', '')
  await page.getByRole('button', { name: 'Снять с публикации' }).click()
  await expect(page.getByRole('button', { name: 'Опубликовать', exact: true })).toBeVisible()
  await page
    .getByRole('dialog', { name: 'Страницы', exact: true })
    .getByRole('button', { name: 'Удалить', exact: true })
    .click()
  await page
    .getByRole('dialog', { name: 'Удалить страницу?' })
    .getByRole('button', { name: 'Отмена' })
    .click()
  await expect(page.getByRole('dialog', { name: 'Удалить страницу?' })).not.toBeVisible()
  await expect(page.getByRole('button', { name: 'Опубликовать', exact: true })).toBeVisible()
  await page
    .getByRole('dialog', { name: 'Страницы', exact: true })
    .getByRole('button', { name: 'Удалить', exact: true })
    .click()
  await page
    .getByRole('dialog', { name: 'Удалить страницу?' })
    .getByRole('button', { name: 'Удалить', exact: true })
    .click()
  await expect(page).toHaveURL(/\/admin\/pages$/)
  await expect(page.getByRole('link', { name: 'Тестовая страница' })).toHaveCount(0)
})

test('preview does not acknowledge unsaved changes and navigation asks before losing them', async ({
  page,
}) => {
  test.skip(process.env['E2E_TARGET'] === 'local')
  await page.addInitScript(() => localStorage.setItem('mock_viewer', 'superadmin'))
  await page.goto('/admin/pages/new')
  await expect(page.locator('[data-editor="ready"]')).toBeVisible()
  await page.locator('.article-editor-title').fill('Несохранённая страница')
  await page.getByRole('button', { name: 'Предпросмотр', exact: true }).click()
  await page.getByRole('button', { name: 'Вернуться в редактор' }).click()
  await page.getByRole('link', { name: 'Страницы', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Остаться' })).toBeVisible()
  await page.getByRole('button', { name: 'Остаться' }).click()
  await expect(page.locator('.article-editor-title')).toHaveText('Несохранённая страница')
})

test('moderator cannot access page management', async ({ page }) => {
  test.skip(process.env['E2E_TARGET'] === 'local')
  await page.addInitScript(() => localStorage.setItem('mock_viewer', 'admin'))
  await page.goto('/admin')
  await expect(page.getByRole('link', { name: /Страницы/ })).toHaveCount(0)
  await page.goto('/admin/pages')
  await expect(page.getByRole('button', { name: 'Создать страницу' })).toHaveCount(0)
})

test('local: creates an Editor.js page with uploaded media and reads it as a guest', async ({
  page,
  browser,
}) => {
  test.skip(process.env['E2E_TARGET'] !== 'local')
  test.setTimeout(120_000)
  await page.goto('/admin/pages')
  await page.getByRole('banner').getByRole('button', { name: 'Войти', exact: true }).click()
  await page.getByRole('button', { name: /Софья Суперова/ }).click()
  await expect(page.getByRole('button', { name: 'Создать страницу' })).toBeVisible()
  await page.getByRole('button', { name: 'Создать страницу' }).click()
  await expect(page.locator('[data-editor="ready"]')).toBeVisible({ timeout: 60_000 })
  const slug = `e2e-page-${Date.now()}`
  await page.getByRole('textbox', { name: 'Заголовок', exact: true }).fill('Локальная страница')
  await page.getByLabel('Короткий адрес').fill(slug)
  await page.locator('.ce-paragraph').first().fill('Реальный текст страницы')
  await page.locator('.ce-paragraph').first().click()
  await page.locator('.ce-toolbar__plus').click()
  await page.locator('.ce-popover-item').filter({ hasText: 'Image' }).click()
  const chooser = page.waitForEvent('filechooser')
  await page.getByText('Select an Image').click()
  await (
    await chooser
  ).setFiles({
    name: 'page.png',
    mimeType: 'image/png',
    buffer: Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      'base64',
    ),
  })
  await expect(page.locator('.image-tool__image-picture')).toBeVisible()
  await page.getByRole('button', { name: 'Сохранить черновик', exact: true }).click()
  await expect(page.getByText('Сохранено', { exact: true })).toBeVisible()
  const guest = await browser.newContext()
  const public_page = await guest.newPage()
  const origin = new URL(page.url()).origin
  try {
    await public_page.goto(`${origin}/pages/${slug}`)
    await expect(public_page.getByText('Страница не найдена', { exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Опубликовать', exact: true }).click()
    await expect(
      page
        .getByRole('dialog', { name: 'Страницы', exact: true })
        .getByText('Опубликована', { exact: true }),
    ).toBeVisible()
    await public_page.reload()
    await expect(
      public_page.getByRole('heading', { name: 'Локальная страница', exact: true }),
    ).toBeVisible()
    await expect(public_page.getByText('Реальный текст страницы', { exact: true })).toBeVisible()
    await expect(public_page.getByRole('main').locator('figure img')).toBeVisible()
    await page.getByRole('link', { name: 'Страницы', exact: true }).click()
    await page.getByRole('link', { name: 'Локальная страница', exact: true }).click()
    await expect(page.locator('.image-tool__image-picture')).toBeVisible()
    await page.locator('.ce-paragraph').first().fill('Правки после истечения сессии')
    const session_cookie = (await page.context().cookies()).find((cookie) =>
      cookie.name.includes('session'),
    )
    if (!session_cookie) throw new Error('Missing session cookie')
    await page.context().clearCookies({ name: session_cookie.name })
    await page.getByRole('button', { name: 'Сохранить изменения', exact: true }).click()
    await expect(page.getByRole('button', { name: /Софья Суперова/ })).toBeVisible()
    await expect(page.locator('.ce-paragraph').first()).toHaveText('Правки после истечения сессии')
    await page.getByRole('button', { name: /Софья Суперова/ }).click()
    await expect(page.getByRole('button', { name: /Софья Суперова/ })).not.toBeVisible()
    await page.getByRole('button', { name: 'Повторить', exact: true }).click()
    await expect(page.getByText('Сохранено', { exact: true })).toBeVisible()
    await public_page.reload()
    await expect(
      public_page.getByText('Правки после истечения сессии', { exact: true }),
    ).toBeVisible()
    await page.getByRole('button', { name: 'Снять с публикации' }).click()
    await expect(page.getByRole('button', { name: 'Опубликовать', exact: true })).toBeVisible()
    await public_page.reload()
    await expect(public_page.getByText('Страница не найдена', { exact: true })).toBeVisible()
    await page
      .getByRole('dialog', { name: 'Страницы', exact: true })
      .getByRole('button', { name: 'Удалить', exact: true })
      .click()
    await page
      .getByRole('dialog', { name: 'Удалить страницу?' })
      .getByRole('button', { name: 'Удалить', exact: true })
      .click()
    await expect(page).toHaveURL(/\/admin\/pages$/)
  } finally {
    await guest.close()
  }
})
