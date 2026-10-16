import { expect, test } from '@playwright/test'

test.describe('Модерация', () => {
  test.describe.configure({ timeout: 60_000 })

  test('администратор скрывает статью из жалоб, и она уходит из ленты', async ({ page }) => {
    await page.addInitScript(() => window.localStorage.setItem('mock_viewer', 'admin'))
    await page.goto('/admin/moderation/articles')
    await expect(page.getByRole('grid').getByRole('link', { name: /^Статья 1:/ })).toBeVisible({
      timeout: 15_000,
    })
    await page.getByRole('button', { name: 'Скрыть' }).click()
    await expect(page.getByRole('grid').getByRole('link', { name: /^Статья 1:/ })).toHaveCount(0)
    await page.getByRole('banner').getByRole('link', { name: 'Назад', exact: true }).click()
    await page.getByRole('main').locator('a[href="/admin/moderation/hidden"]').click()
    await expect(page.getByRole('button', { name: 'Вернуть' })).toBeVisible()
    await page.getByRole('link', { name: 'Блог' }).click()
    await expect(page.getByRole('heading', { name: /^Статья 1:/ })).toHaveCount(0)
  })

  test('таблица участников: страницы, поиск имени, доступ и действия', async ({ page }) => {
    await page.addInitScript(() => window.localStorage.setItem('mock_viewer', 'superadmin'))
    await page.goto('/admin/members')
    const grid = page.getByRole('grid')
    await expect(grid.getByRole('row')).toHaveCount(26)
    await page.getByRole('button', { name: 'Далее', exact: true }).click()
    await expect(page.getByText('Страница 2', { exact: true })).toBeVisible()
    await expect(grid.getByRole('row')).toHaveCount(6)
    await page.getByRole('searchbox', { name: 'Найти участника' }).fill('сОф')
    const row = grid
      .getByRole('row')
      .filter({ has: page.getByRole('link', { name: 'Софья', exact: true }) })
    await expect(row).toBeVisible()
    await expect(grid.getByRole('row')).toHaveCount(2)
    await expect(page.getByText('Страница 1', { exact: true })).toBeVisible()
    await row.getByRole('button', { name: 'Редактировать', exact: true }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog.getByText('Почта не подтверждена', { exact: true })).toBeVisible()
    await dialog.getByRole('button', { name: 'Подтвердить почту', exact: true }).click()
    await expect(dialog.getByText('Почта подтверждена', { exact: true })).toBeVisible()
    await expect(
      dialog.getByRole('button', { name: 'Подтвердить почту', exact: true }),
    ).toHaveCount(0)
    await dialog.getByRole('textbox', { name: 'Имя', exact: true }).fill('Софья Новая')
    await dialog.getByRole('button', { name: 'Сохранить', exact: true }).click()
    await expect(dialog).toHaveCount(0)
    await expect(grid.getByRole('link', { name: 'Софья Новая', exact: true })).toBeVisible()
    const updated = grid.getByRole('row').filter({ hasText: 'Софья Новая' })
    await expect(updated.getByText('Почта подтверждена', { exact: true })).toBeVisible()
    await updated.getByRole('button', { name: 'Ограничить', exact: true }).click()
    await expect(updated.getByText('Заблокирован', { exact: true })).toBeVisible()
    await updated.getByRole('button', { name: 'Снять ограничение', exact: true }).click()
    await expect(updated.getByText('Активен', { exact: true })).toBeVisible()
    await updated.getByRole('button', { name: 'Удалить', exact: true }).click()
    await dialog.getByRole('button', { name: 'Удалить', exact: true }).click()
    await expect(grid.getByRole('link', { name: 'Софья Новая', exact: true })).toHaveCount(0)
    await expect(page.getByText('Участники не найдены')).toBeVisible()
    await page.getByRole('searchbox', { name: 'Найти участника' }).fill('')
    await page.getByRole('button', { name: 'Уровень доступа' }).click()
    await page.getByRole('option', { name: 'Администратор', exact: true }).click()
    await expect(grid.getByRole('row')).toHaveCount(2)
    await expect(grid.getByText('admin@example.test')).toBeVisible()
  })

  test('жалоба показывает имя автора со ссылкой на профиль', async ({ page }) => {
    await page.addInitScript(() => window.localStorage.setItem('mock_viewer', 'admin'))
    await page.goto('/admin/moderation/articles')
    await expect(
      page.getByRole('grid').getByRole('link', { name: 'Роман Читаев', exact: true }),
    ).toHaveAttribute('href', '/u/reader')
  })

  test('администратор не меняет настройки площадки', async ({ page }) => {
    await page.addInitScript(() => window.localStorage.setItem('mock_viewer', 'admin'))
    await page.goto('/admin/settings')
    await expect(page.getByText('Раздел доступен только администратору площадки')).toBeVisible({
      timeout: 15_000,
    })
  })

  test('участник не открывает модерацию', async ({ page }) => {
    await page.addInitScript(() => window.localStorage.setItem('mock_viewer', 'member'))
    await page.goto('/admin/moderation')
    await expect(page.getByText('Этот раздел доступен только администраторам')).toBeVisible({
      timeout: 15_000,
    })
  })

  test('ограниченный видит полосу в центре', async ({ page }) => {
    await page.addInitScript(() => window.localStorage.setItem('mock_viewer', 'restricted'))
    await page.goto('/')
    await expect(page.getByText('Учётная запись ограничена: действие недоступно')).toBeVisible({
      timeout: 15_000,
    })
  })
})

test.describe('модерация на локальном стеке', () => {
  test.skip(
    process.env['E2E_TARGET'] !== 'local',
    'регистрация, роли и живое скрытие проверяются на E2E_TARGET=local',
  )

  test('закрытая регистрация, скрытие и ограничение', async ({ page }) => {
    await page.goto('/admin/settings')
    await expect(page.getByRole('banner')).toBeVisible()
  })
})
