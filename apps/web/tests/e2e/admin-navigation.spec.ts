import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

const SETTINGS = [
  ['/admin/settings', 'Общие настройки'],
  ['/admin/settings/access', 'Регистрация и публикации'],
  ['/admin/settings/reactions', 'Виды реакций'],
  ['/admin/settings/status-icons', 'Иконки статусов профиля'],
  ['/admin/settings/seo', 'SEO'],
  ['/admin/settings/publisher', 'Издатель'],
  ['/admin/settings/covers', 'Превью ссылок'],
  ['/admin/members', 'Управление участниками'],
  ['/admin/topics', 'Темы площадки'],
] as const
const MODERATION = [
  ['/admin/moderation', 'Жалобы на статьи'],
  ['/admin/moderation/hidden', 'Скрытое'],
  ['/admin/moderation/comments', 'Жалобы на комментарии'],
  ['/admin/moderation/find', 'Поиск статьи'],
] as const

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
      await expect(page).toHaveURL(role === 'superadmin' ? '/admin/settings' : '/admin/moderation')
      await expect(page.getByRole('navigation', { name: 'Разделы админки' })).toBeVisible()
    }
  })
}

test('категории доступны по адресам, переходы и возврат сохраняют активный пункт', async ({
  page,
}, info) => {
  test.setTimeout(90_000)
  await page.addInitScript(() => localStorage.setItem('mock_viewer', 'superadmin'))
  await page.goto('/admin/settings')
  for (const [path, title] of [...SETTINGS, ...MODERATION]) {
    const nav = page.getByRole('navigation', { name: 'Разделы админки' })
    await nav.locator(`a[href="${path}"]`).click()
    await expect(page).toHaveURL(path)
    await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible()
    await expect(nav.locator('[aria-current="page"]')).toHaveAttribute('href', path)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  }
  await page.goBack()
  await expect(page).toHaveURL('/admin/moderation/comments')
  await page.reload()
  await expect(
    page.getByRole('heading', { name: 'Жалобы на комментарии', exact: true }),
  ).toBeVisible()
  await page.goto('/admin/settings/access')
  const result = await new AxeBuilder({ page }).include('main').analyze()
  expect(
    result.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical'),
  ).toEqual([])
  await page.screenshot({ path: info.outputPath('admin-access.png'), fullPage: true })
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
  const nav = page.getByRole('navigation', { name: 'Разделы админки' })
  await expect(nav.locator('a')).toHaveCount(4)
  for (const [path] of SETTINGS) {
    await page.goto(path)
    await expect(page.getByText('Раздел доступен только администратору площадки')).toBeVisible()
  }
  expect(requests).toEqual([])
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

test('поиск статьи работает с клавиатуры и не открывает пустой адрес', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('mock_viewer', 'admin'))
  await page.goto('/admin/moderation/find')
  await expect(page.getByRole('button', { name: 'Открыть', exact: true })).toBeDisabled()
  await page.getByRole('textbox', { name: 'Адрес статьи' }).fill('statya-1')
  await page.getByRole('textbox', { name: 'Адрес статьи' }).press('Enter')
  await expect(page).toHaveURL('/p/statya-1?from=moderation')
  await expect(page.getByRole('button', { name: 'Скрыть', exact: true }).first()).toBeVisible()
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
  await page.getByRole('textbox', { name: 'Смех', exact: true }).fill('😂')
  const saved = page.waitForResponse(
    (r) => r.url().endsWith('/v1/settings') && r.request().method() === 'PUT',
  )
  await page.getByRole('button', { name: 'Сохранить', exact: true }).click()
  const response = await saved
  expect(response.ok()).toBe(true)
  expect(response.request().postDataJSON()).toMatchObject({
    name: 'Блог',
    reaction_appearances: [
      expect.objectContaining({ kind: 'laugh', presentation: 'emoji', emoji: '😂' }),
      expect.anything(),
      expect.anything(),
      expect.anything(),
    ],
  })
})
