import { expect, test } from '@playwright/test'

for (const width of [390, 768, 1280, 1420, 1600]) {
  test(`wide admin sections and the header share a responsive width: ${width}px`, async ({
    page,
  }) => {
    test.skip(process.env['E2E_TARGET'] === 'local')
    await page.addInitScript(() => localStorage.setItem('mock_viewer', 'superadmin'))
    await page.setViewportSize({ width, height: 900 })
    for (const path of [
      '/admin/moderation',
      '/admin/moderation/articles',
      '/admin/pages',
      '/admin/settings',
    ]) {
      await page.goto(path)
      await expect(page.locator('main h1')).toBeVisible()
      const grid = page.locator('header[role="banner"] + div')
      const grid_box = await grid.boundingBox()
      const header_box = await page.locator('header[role="banner"] > div').boundingBox()
      if (!grid_box || !header_box) throw new Error('Missing shell containers')
      const content_width = path === '/admin/settings' ? 640 : 848
      const side_width = width >= 1280 ? 572 : width >= 768 ? 236 : 0
      expect(grid_box.width).toBe(Math.min(width, content_width + side_width))
      expect(header_box.width).toBe(grid_box.width)
      expect(header_box.x).toBe(grid_box.x)
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      )
      if (width >= 1280) {
        await expect(page.getByRole('complementary')).toBeVisible()
        for (const [header_selector, body_selector] of [
          ['.site-header-brand', '[data-shell-scroll="left"]'],
          ['.site-header-center', 'main'],
          ['.site-header-actions', 'main + aside'],
        ] as const) {
          const header_column = await page.locator(header_selector).boundingBox()
          const body_column = await page.locator(body_selector).boundingBox()
          expect(header_column?.x).toBe(body_column?.x)
          expect(header_column?.width).toBe(body_column?.width)
        }
        if (width >= 1420)
          expect((await page.locator('main').boundingBox())?.width).toBe(content_width)
      } else await expect(page.getByRole('complementary')).toHaveCount(0)
    }
  })
}

test('status creation is an accessible header action and saving uses the card footer', async ({
  page,
}) => {
  test.skip(process.env['E2E_TARGET'] === 'local')
  await page.addInitScript(() => localStorage.setItem('mock_viewer', 'superadmin'))
  await page.goto('/admin/settings/status-icons')
  const header = page
    .getByRole('heading', { name: 'Иконки статусов профиля', exact: true })
    .locator('..')
  const add = header.getByRole('button', { name: 'Добавить иконку статуса' })
  await expect(add).toBeVisible()
  await expect(add).toHaveText('')
  await add.focus()
  const chooser = page.waitForEvent('filechooser')
  await page.keyboard.press('Enter')
  await (
    await chooser
  ).setFiles({
    name: 'status.png',
    mimeType: 'image/png',
    buffer: Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      'base64',
    ),
  })
  await page.getByRole('textbox', { name: 'Название статуса', exact: true }).fill('Busy')
  const save = page.getByRole('button', { name: 'Сохранить', exact: true })
  await expect(save).toHaveAttribute('type', 'submit')
  await save.click()
  await expect(page.getByText('Настройки сохранены', { exact: true })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('textbox', { name: 'Название статуса', exact: true })).toHaveValue(
    'Busy',
  )
})

test('page editor shares the composer window, keeps text across preview/fullscreen and closes to its list', async ({
  page,
}) => {
  test.skip(process.env['E2E_TARGET'] === 'local')
  await page.addInitScript(() => localStorage.setItem('mock_viewer', 'superadmin'))
  await page.goto('/admin/pages')
  const add = page.getByRole('button', { name: 'Создать страницу' })
  await expect(add).toHaveText('')
  await add.click()
  const window = page.getByRole('dialog', { name: 'Страницы', exact: true })
  await expect(window.locator('[data-editor="ready"]')).toBeVisible()
  await window.getByRole('textbox', { name: 'Заголовок', exact: true }).fill('Window test')
  await window.getByLabel('Короткий адрес').fill('window-test')
  await window.locator('.ce-paragraph').first().fill('Content')
  await window.getByRole('button', { name: 'Развернуть на весь экран' }).click()
  await expect(window).toHaveClass(/article-editor-window--full/)
  await window.getByRole('button', { name: 'Предпросмотр', exact: true }).click()
  await expect(window.getByRole('heading', { name: 'Window test' })).toBeVisible()
  await window.getByRole('button', { name: 'Вернуться в редактор' }).click()
  await window.getByRole('button', { name: 'Свернуть редактор' }).click()
  await expect(window.locator('.ce-paragraph').first()).toHaveText('Content')
  await window.getByRole('button', { name: 'Закрыть', exact: true }).click()
  await page.getByRole('button', { name: 'Остаться', exact: true }).click()
  await expect(window.locator('.ce-paragraph').first()).toHaveText('Content')
  await window.getByRole('button', { name: 'Сохранить черновик', exact: true }).click()
  await expect(window.getByText('Сохранено', { exact: true })).toBeVisible()
  await window.getByRole('button', { name: 'Закрыть', exact: true }).click()
  await expect(page).toHaveURL(/\/admin\/pages$/)
  await expect(page.getByRole('link', { name: 'Window test' })).toBeVisible()
})

for (const [path, role] of [
  ['/write', 'member'],
  ['/admin/pages/new', 'superadmin'],
] as const) {
  test(`expired session retains the local document in ${path}`, async ({ page }) => {
    test.setTimeout(90_000)
    test.skip(process.env['E2E_TARGET'] === 'local')
    await page.addInitScript((viewer) => localStorage.setItem('mock_viewer', viewer), role)
    await page.goto(path)
    await expect(page.locator('[data-editor="ready"]')).toBeVisible({ timeout: 60_000 })
    await page.getByRole('textbox', { name: 'Заголовок', exact: true }).fill('Unsaved title')
    await page.locator('.ce-paragraph').first().fill('Unsaved document')
    if (role === 'superadmin') await page.getByLabel('Короткий адрес').fill('expired-page')
    await page.evaluate(() => localStorage.setItem('mock_viewer', 'guest'))
    if (role === 'member') await page.getByRole('button', { name: 'Параметры статьи' }).click()
    await page.getByRole('button', { name: 'Сохранить черновик', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Сессия истекла', exact: true })).toBeVisible()
    await expect(page.locator('[data-editor="ready"]')).toHaveCount(1)
    await expect(page.locator('.article-editor-title')).toHaveText('Unsaved title')
    await expect(page.locator('.ce-paragraph').first()).toHaveText('Unsaved document')
  })
}

test('the removed about route shows the standard not-found page', async ({ page }) => {
  await page.goto('/about')
  await expect(page.getByText('Ничего не найдено', { exact: true })).toBeVisible()
  await expect(page.locator('a[href="/about"]')).toHaveCount(0)
})
