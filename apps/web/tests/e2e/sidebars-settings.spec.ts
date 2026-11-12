import { expect, test, type Page } from '@playwright/test'

async function addSection(page: Page, title: string) {
  await page.getByRole('main').getByRole('button', { name: 'Добавить секцию' }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Заголовок', { exact: true }).fill(title)
  await dialog.getByRole('button', { name: 'Сохранить', exact: true }).click()
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('mock_viewer', 'superadmin'))
})

test('keeps drafts across tabs, cancels edits, saves and warns before leaving', async ({
  page,
}) => {
  await page.goto('/admin/sections')
  const main = page.getByRole('main')
  await addSection(page, 'Ссылки')
  await expect(main.getByRole('button', { name: /Ссылки/ }).first()).toBeVisible()
  await main.getByRole('tab', { name: 'Правый', exact: true }).click()
  await addSection(page, 'Еще комментарии')
  await main.getByRole('tab', { name: 'Левый', exact: true }).click()
  await expect(main.getByRole('button', { name: /Ссылки/ }).first()).toBeVisible()
  await main.getByRole('button', { name: 'Сохранить', exact: true }).click()
  await expect(main.getByText('Сохранено', { exact: true })).toHaveText('Сохранено')
  await main.getByRole('tab', { name: 'Правый', exact: true }).click()
  await expect(main.getByRole('button', { name: /Еще комментарии/ }).first()).toBeVisible()
  await main.getByRole('button', { name: 'Отмена', exact: true }).click()
  await expect(main.getByText('Еще комментарии', { exact: true })).toHaveCount(0)
  await addSection(page, 'Черновик')
  await page.getByRole('banner').getByRole('link', { name: 'Назад' }).click()
  await expect(page.getByRole('dialog')).toContainText('Есть несохраненные изменения')
  await page.getByRole('dialog').getByRole('button', { name: 'Отмена' }).click()
  await expect(page).toHaveURL(/admin\/sidebars/)
})

test('edits links and widgets in compact sections with explicit saves', async ({ page }) => {
  await page.goto('/admin/sidebars?side=left')
  const main = page.getByRole('main')
  await addSection(page, 'Полезные ссылки')
  await main.getByRole('button', { name: 'Полезные ссылки', exact: true }).click()
  await main.getByRole('button', { name: 'Добавить элемент' }).last().click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Подпись').fill('Правила')
  await dialog.getByRole('textbox', { name: 'URL', exact: true }).fill('https://example.test/rules')
  await dialog.getByRole('button', { name: 'Сохранить', exact: true }).click()
  await expect(main.getByText('Правила', { exact: true })).toBeVisible()
  await main.getByRole('button', { name: 'Сохранить', exact: true }).click()
  await expect(main.getByText('Сохранено', { exact: true })).toHaveText('Сохранено')
  await main.getByRole('tab', { name: 'Правый', exact: true }).click()
  await addSection(page, 'Контакты')
  await main.getByRole('button', { name: 'Контакты', exact: true }).click()
  await main.getByRole('button', { name: 'Добавить элемент' }).last().click()
  await page.getByRole('menuitem', { name: 'Форма обратной связи' }).click()
  await dialog.getByRole('button', { name: 'Сохранить', exact: true }).click()
  await expect(dialog.getByRole('alert').first()).toBeVisible()
  await dialog.getByLabel('Email получателя').fill('owner@example.test')
  await dialog.getByRole('button', { name: 'Сохранить', exact: true }).click()
  await expect(main.getByText('Форма обратной связи', { exact: true })).toBeVisible()
  await main.getByRole('button', { name: 'Сохранить', exact: true }).click()
  await expect(main.getByText('Сохранено', { exact: true })).toHaveText('Сохранено')
})

test('retains the local draft after a conflict and confirms replacement', async ({ page }) => {
  await page.goto('/admin/sidebars?side=right')
  const main = page.getByRole('main')
  await addSection(page, 'Локальная секция')
  await page.evaluate(async () => {
    const current = await (await fetch('/v1/admin/sidebar')).json()
    const result = await fetch('/v1/admin/sidebar', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ expected_version: current.version, sections: current.sections }),
    })
    if (!result.ok) throw new Error('Concurrent editor could not save')
  })
  await main.getByRole('button', { name: 'Сохранить', exact: true }).click()
  await expect(main.getByRole('alert')).toContainText('Сайдбар изменен')
  await expect(main.getByRole('button', { name: 'Локальная секция', exact: true })).toBeVisible()
  await main.getByRole('button', { name: 'Загрузить сохраненную версию' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Отмена', exact: true }).click()
  await expect(main.getByRole('button', { name: 'Локальная секция', exact: true })).toBeVisible()
  await main.getByRole('button', { name: 'Загрузить сохраненную версию' }).click()
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Загрузить сохраненную версию' })
    .click()
  await expect(main.getByText('Локальная секция', { exact: true })).toHaveCount(0)
})

test('reorders and deletes sections with accessible actions', async ({ page }) => {
  await page.goto('/admin/sidebars?side=left')
  const main = page.getByRole('main')
  await addSection(page, 'Первая')
  await addSection(page, 'Вторая')
  await main.getByRole('button', { name: 'Действия для Вторая', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Переместить выше' }).click()
  const order = () => main.locator('[data-slot="accordion-trigger"]').allTextContents()
  await expect
    .poll(async () => (await order()).map((text) => text.replace(/\d/g, '').trim()).slice(-2))
    .toEqual(['Вторая', 'Первая'])
  // Drag handles expose the keyboard interaction supplied by dnd-kit.
  const handle = main.getByRole('button', { name: 'Перетащить Вторая', exact: true })
  await handle.focus()
  await handle.press('Space')
  await handle.press('ArrowDown')
  await handle.press('Space')
  await main.getByRole('button', { name: 'Действия для Первая', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Удалить', exact: true }).click()
  await expect(main.getByRole('button', { name: 'Первая', exact: true })).toHaveCount(0)
  await main.getByRole('button', { name: 'Отмена', exact: true }).click()
  await expect(main.getByRole('button', { name: 'Вторая', exact: true })).toHaveCount(0)
})

test('uses the shared link editor inside a buttons widget', async ({ page }) => {
  await page.goto('/admin/sidebars?side=right')
  const main = page.getByRole('main')
  await addSection(page, 'Справка')
  await main.getByRole('button', { name: 'Справка', exact: true }).click()
  await main.getByRole('button', { name: 'Добавить элемент' }).last().click()
  await page.getByRole('menuitem', { name: 'Сворачиваемый список кнопок' }).click()
  const outer = page.getByRole('dialog').first()
  await outer.getByLabel('Заголовок', { exact: true }).fill('Документы')
  await outer.getByRole('button', { name: 'Добавить кнопку' }).click()
  const link = page.getByRole('dialog').last()
  await link.getByLabel('Подпись').fill('О проекте')
  await link.locator('input[type="file"]').setInputFiles({
    name: 'bad.svg',
    mimeType: 'image/svg+xml',
    buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'),
  })
  await expect(link.getByRole('alert')).toBeVisible()
  await link.locator('input[type="file"]').setInputFiles({
    name: 'icon.svg',
    mimeType: 'image/svg+xml',
    buffer: Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/></svg>',
    ),
  })
  await expect(link.getByRole('alert')).toHaveCount(0)
  await link.getByRole('button', { name: /Назначение ссылки/ }).click()
  await page.getByRole('option', { name: 'Страница', exact: true }).click()
  await link.getByRole('combobox', { name: 'Страница', exact: true }).fill('Добро')
  await page.getByRole('option', { name: 'Добро пожаловать', exact: true }).click()
  await link.getByRole('button', { name: 'Сохранить', exact: true }).click()
  await outer.getByRole('button', { name: 'Сохранить', exact: true }).click()
  await main.getByRole('button', { name: 'Сохранить', exact: true }).click()
  await expect(main.getByText('Сохранено', { exact: true })).toBeVisible()
  await page.screenshot({ path: '/tmp/blog-sidebars-editor.png' })
})
