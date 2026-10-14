import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

const SETTINGS = [
  ['/admin/settings/general', 'Общие настройки'],
  ['/admin/settings/access', 'Регистрация и публикации'],
  ['/admin/settings/layout', 'Оболочка'],
  ['/admin/settings/reactions', 'Виды реакций'],
  ['/admin/settings/status-icons', 'Иконки статусов профиля'],
  ['/admin/settings/badges', 'Бейджи'],
  ['/admin/settings/seo', 'SEO'],
  ['/admin/settings/publisher', 'Издатель'],
  ['/admin/settings/covers', 'Превью ссылок'],
] as const
const MODERATION = [
  ['/admin/moderation/articles', 'Статьи'],
  ['/admin/moderation/comments', 'Жалобы на комментарии'],
  ['/admin/moderation/hidden', 'Скрытые статьи'],
  ['/admin/moderation/find', 'Поиск статьи'],
] as const
const back = (page: Page) =>
  page.getByRole('banner').getByRole('link', { name: 'Назад', exact: true })

async function chooseLightTheme(page: Page) {
  await page
    .getByRole('navigation', { name: 'Навигация', exact: true })
    .getByRole('link', { name: /тема$/ })
    .click()
  await page.getByRole('menuitemradio', { name: 'Светлая', exact: true }).click()
}

for (const role of ['guest', 'member', 'admin', 'superadmin'] as const) {
  test(`ссылка на админку в меню: ${role}`, async ({ page }) => {
    await page.addInitScript((role) => localStorage.setItem('mock_viewer', role), role)
    await page.goto('/')
    if (role === 'guest') {
      await expect(page.getByRole('button', { name: 'Меню учётной записи' })).toHaveCount(0)
      return
    }
    await page.getByRole('button', { name: 'Меню учётной записи' }).click()
    const link = page.getByRole('menuitem', { name: 'Админка', exact: true })
    if (role === 'member') await expect(link).toHaveCount(0)
    else {
      await link.click()
      await expect(page).toHaveURL('/admin')
      const nav = page.getByRole('navigation', { name: 'Админка', exact: true })
      await expect(nav.getByRole('link')).toHaveCount(role === 'superadmin' ? 6 : 1)
      if (role === 'superadmin') {
        await expect(nav.getByRole('link', { name: /^Участники/ })).toBeVisible()
        await expect(nav.getByRole('link', { name: /^Темы/ })).toBeVisible()
      }
      await expect(back(page)).toHaveAttribute('href', '/')
    }
  })
}

test('каталоги, переходы и прямое открытие следуют иерархии', async ({ page }, info) => {
  test.setTimeout(90_000)
  await page.addInitScript(() => localStorage.setItem('mock_viewer', 'superadmin'))
  await page.goto('/admin')
  await expect(page.getByRole('main').getByRole('heading', { level: 1 })).toHaveText('Админка')
  if (info.project.name === 'wide-light')
    await chooseLightTheme(page)
  if (info.project.name === 'wide-light')
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  await page.screenshot({
    path: info.outputPath('admin-home-catalog.png'),
    fullPage: true,
    animations: 'disabled',
  })
  await page
    .getByRole('main')
    .getByRole('link', { name: /^Настройки площадки/ })
    .click()
  await expect(page).toHaveURL('/admin/settings')
  for (const [path, title] of SETTINGS) {
    const nav = page.getByRole('navigation', { name: 'Настройки площадки', exact: true })
    await nav.locator(`a[href="${path}"]`).click()
    await expect(page.getByRole('heading', { name: title, exact: true, level: 1 })).toBeVisible()
    await expect(page.getByRole('main').getByRole('navigation')).toHaveCount(0)
    await expect(back(page)).toHaveAttribute('href', '/admin/settings')
    await page.reload()
    await back(page).click()
    await expect(page).toHaveURL('/admin/settings')
  }
  await back(page).click()
  await page
    .getByRole('main')
    .getByRole('link', { name: /^Модерация/ })
    .click()
  for (const [path, title] of MODERATION) {
    await page
      .getByRole('navigation', { name: 'Модерация', exact: true })
      .locator(`a[href="${path}"]`)
      .click()
    await expect(page.getByRole('heading', { name: title, exact: true, level: 1 })).toBeVisible()
    await expect(back(page)).toHaveAttribute('href', '/admin/moderation')
    await back(page).click()
  }
  await back(page).click()
  for (const [path, title] of [
    ['/admin/members', 'Управление участниками'],
    ['/admin/topics', 'Темы площадки'],
  ]) {
    await page
      .getByRole('navigation', { name: 'Админка', exact: true })
      .locator(`a[href="${path}"]`)
      .click()
    await expect(page.getByRole('heading', { name: title, exact: true, level: 1 })).toBeVisible()
    await expect(back(page)).toHaveAttribute('href', '/admin')
    await back(page).click()
  }
  await page
    .getByRole('main')
    .getByRole('link', { name: /^Настройки площадки/ })
    .click()
  await page.goBack()
  await expect(page).toHaveURL('/admin')
  await page.goForward()
  await expect(page).toHaveURL('/admin/settings')
  await page.reload()
  if (info.project.name === 'wide-light') {
    await chooseLightTheme(page)
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  }
  const rows = page
    .getByRole('navigation', { name: 'Настройки площадки', exact: true })
    .getByRole('link')
  await expect(rows).toHaveCount(SETTINGS.length)
  for (const row of await rows.all()) {
    const box = await row.boundingBox()
    expect(box?.height).toBeGreaterThanOrEqual(80)
    expect(await row.locator('svg').count()).toBe(2)
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  const result = await new AxeBuilder({ page }).include('main').analyze()
  expect(
    result.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical'),
  ).toEqual([])
  await page.screenshot({
    path: info.outputPath('admin-settings-catalog.png'),
    fullPage: true,
    animations: 'disabled',
  })
})

test('администратор видит только модерацию, закрытые категории не запрашивают настройки', async ({
  page,
}) => {
  await page.addInitScript(() => localStorage.setItem('mock_viewer', 'admin'))
  const requests: string[] = []
  page.on('request', (request) => {
    if (request.url().includes('/v1/settings/admin')) requests.push(request.url())
  })
  await page.goto('/admin')
  await expect(
    page.getByRole('navigation', { name: 'Админка', exact: true }).getByRole('link'),
  ).toHaveCount(1)
  await page
    .getByRole('main')
    .getByRole('link', { name: /^Модерация/ })
    .click()
  await expect(
    page.getByRole('navigation', { name: 'Модерация', exact: true }).getByRole('link'),
  ).toHaveCount(4)
  for (const path of [
    '/admin/settings',
    ...SETTINGS.map(([path]) => path),
    '/admin/members',
    '/admin/topics',
    '/admin/pages',
    '/admin/sections',
  ]) {
    await page.goto(path)
    await expect(page.getByText('Раздел доступен только администратору площадки')).toBeVisible()
  }
  expect(requests).toEqual([])
})

test('возврат из статьи сохраняет очередь модерации и переживает перезагрузку', async ({
  page,
}) => {
  await page.addInitScript(() => localStorage.setItem('mock_viewer', 'admin'))
  await page.goto('/admin/moderation/articles')
  await page
    .getByRole('main')
    .getByRole('link', { name: /^Статья 1:/ })
    .click()
  await expect(page).toHaveURL('/p/statya-1?from=moderation')
  await page.reload()
  await expect(back(page)).toHaveAttribute('href', '/admin/moderation/articles')
  await back(page).click()
  await page.getByRole('button', { name: 'Скрыть', exact: true }).click()
  await expect(page.getByRole('grid').getByRole('link', { name: /^Статья 1:/ })).toHaveCount(0)
  await back(page).click()
  await page
    .getByRole('main')
    .getByRole('link', { name: /^Скрытые статьи/ })
    .click()
  await expect(page.getByRole('button', { name: 'Вернуть', exact: true })).toBeVisible()
  await page
    .getByRole('main')
    .getByRole('link', { name: /^Статья 1:/ })
    .click()
  await expect(back(page)).toHaveAttribute('href', '/admin/moderation/hidden')
  await back(page).click()
  await expect(page).toHaveURL('/admin/moderation/hidden')
  await page.goto('/p/statya-1?from=moderation')
  await expect(back(page)).toHaveAttribute('href', '/admin/moderation/articles')
})

test('закрытие поиска в шапке сохраняет родительский адрес', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('mock_viewer', 'superadmin'))
  await page.goto('/admin/settings/general')
  await expect(back(page)).toHaveAttribute('href', '/admin/settings')
  await page.getByRole('button', { name: 'Поиск', exact: true }).click()
  await page.keyboard.press('Escape')
  await expect(back(page)).toHaveAttribute('href', '/admin/settings')
})

test('строка каталога доступна с клавиатуры и в новой вкладке', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('mock_viewer', 'superadmin'))
  await page.goto('/admin')
  const link = page.getByRole('main').getByRole('link', { name: /^Настройки площадки/ })
  await expect(link).toHaveAttribute('href', '/admin/settings')
  await link.focus()
  await link.press('Enter')
  await expect(page).toHaveURL('/admin/settings')
  await back(page).click()
  const opened = page.context().waitForEvent('page')
  await link.click({ button: 'middle' })
  const popup = await opened
  await popup.waitForLoadState()
  await expect(popup).toHaveURL('/admin/settings')
  await popup.close()
})

test('сохранение регистрации не изменяет другие категории и остаётся после перезагрузки', async ({
  page,
}) => {
  await page.addInitScript(() => localStorage.setItem('mock_viewer', 'superadmin'))
  await page.goto('/admin/settings/access')
  await expect(page.getByRole('textbox', { name: 'Название', exact: true })).toHaveCount(0)
  const registration = page.getByRole('switch', { name: 'Регистрация открыта' })
  await expect(registration).toBeChecked()
  await page.getByText('Регистрация открыта', { exact: true }).click()
  const saved = page.waitForResponse(
    (r) => r.url().endsWith('/v1/settings') && r.request().method() === 'PUT',
  )
  await page.getByRole('button', { name: 'Сохранить', exact: true }).click()
  const response = await saved
  expect(response.ok()).toBe(true)
  expect(response.request().postDataJSON()).toMatchObject({
    name: 'Блог',
    registration_open: false,
    new_members_can_publish: true,
  })
  await expect(page.getByText('Настройки сохранены')).toBeVisible()
  await page.reload()
  await expect(registration).not.toBeChecked()
})

test('поиск статьи фильтрует таблицу, сохраняет запрос в адресе и открывает статью с клавиатуры', async ({
  page,
}) => {
  await page.addInitScript(() => localStorage.setItem('mock_viewer', 'admin'))
  await page.goto('/admin/moderation/find')
  const main = page.getByRole('main')
  await main.getByRole('searchbox', { name: 'Поиск', exact: true }).fill('statya-1')
  await expect(page).toHaveURL('/admin/moderation/find?q=statya-1')
  const rows = main.getByRole('rowheader')
  await expect(rows.first()).toHaveText(/^Статья 1:/)
  const link = rows.first().getByRole('link')
  await link.focus()
  await link.press('Enter')
  await expect(page).toHaveURL('/p/statya-1?from=moderation')
  await expect(page.getByRole('button', { name: 'Скрыть', exact: true }).first()).toBeVisible()
  await expect(back(page)).toHaveAttribute('href', '/admin/moderation/find?q=statya-1')
  await back(page).click()
  await expect(page).toHaveURL('/admin/moderation/find?q=statya-1')
  await expect(main.getByRole('searchbox', { name: 'Поиск', exact: true })).toHaveValue('statya-1')
})

test('реакции проверяют выбранный тип и сохраняются отдельно от общих настроек', async ({
  page,
}) => {
  await page.addInitScript(() => localStorage.setItem('mock_viewer', 'superadmin'))
  await page.goto('/admin/settings/reactions')
  const group = page.getByRole('radiogroup', { name: 'Смех', exact: true })
  await group.getByText('Изображение', { exact: true }).click()
  await expect(group.getByRole('radio', { name: 'Изображение', exact: true })).toBeChecked()
  await page.getByRole('button', { name: 'Сохранить', exact: true }).click()
  await expect(page.getByText('Загрузите изображение: пустой адрес не сохраняется')).toBeVisible()
  await group.getByText('Эмодзи', { exact: true }).click()
  await page.getByRole('textbox', { name: 'Смех, Эмодзи', exact: true }).fill('😂')
  const saved = page.waitForResponse(
    (r) => r.url().endsWith('/v1/settings') && r.request().method() === 'PUT',
  )
  await page.getByRole('button', { name: 'Сохранить', exact: true }).click()
  const response = await saved
  expect(response.ok()).toBe(true)
  const body = response.request().postDataJSON() as {
    name: string
    reaction_appearances: Array<{ kind: string; presentation: string; emoji?: string }>
  }
  expect(body.name).toBe('Блог')
  expect(body.reaction_appearances).toHaveLength(4)
  expect(body.reaction_appearances).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ kind: 'laugh', presentation: 'emoji', emoji: '😂' }),
    ]),
  )
})
