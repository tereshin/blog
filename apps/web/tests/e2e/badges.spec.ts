import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'

async function navigate(page: Page, path: string) {
  await page.evaluate((target) => {
    history.pushState({ idx: (history.state?.idx ?? 0) + 1 }, '', target)
    dispatchEvent(new PopStateEvent('popstate'))
  }, path)
  await expect.poll(() => new URL(page.url()).pathname).toBe(path)
}

const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
)

test('admin creates a badge; earning, editing and archiving preserve it in the profile', async ({
  page,
}) => {
  test.setTimeout(90000)
  await page.addInitScript(() => localStorage.setItem('mock_viewer', 'superadmin'))
  await page.goto('/admin/settings/badges')
  await expect(page.getByRole('heading', { name: 'Бейджи', exact: true })).toBeVisible({
    timeout: 20000,
  })
  const upload = page
    .getByRole('button', { name: 'Добавить бейдж', exact: true })
    .locator('..')
    .locator('input[type="file"]')
  await upload.setInputFiles({ name: 'badge.png', mimeType: 'image/png', buffer: PNG })
  const added = page.getByRole('group', { name: 'Новый бейдж', exact: true })
  await expect(added).toBeVisible()
  await added.getByRole('textbox', { name: 'Название бейджа' }).fill('Две публикации')
  await page
    .getByRole('group', { name: 'Две публикации', exact: true })
    .getByRole('spinbutton', { name: 'Порог' })
    .fill('2')
  await page.getByRole('button', { name: 'Сохранить', exact: true }).click()
  await expect(page.getByText('Настройки сохранены', { exact: true })).toBeVisible()
  await navigate(page, '/u/anna')
  await expect(page.getByRole('button', { name: 'Две публикации', exact: true })).toHaveCount(0)
  // Simulate the second published post; backend issuance itself is covered with PostgreSQL.
  await page.evaluate(() =>
    sessionStorage.setItem(
      'mock_articles',
      JSON.stringify([
        {
          id: '00000000-0000-4000-8000-000000000099',
          author_id: '0b3a4c50-3333-4c33-8c33-000000000001',
          author_name: 'Анна Авторова',
          author_slug: 'anna',
          title: 'Вторая публикация',
          slug: 'second',
          status: 'published',
          topic_id: '5f0f6a52-0d8b-4f6e-a8b1-000000000001',
          blocks: { blocks: [] },
          visibility: 'public',
          comments_enabled: true,
          published_at: new Date().toISOString(),
        },
      ]),
    ),
  )
  await navigate(page, '/discovery')
  await navigate(page, '/u/anna')
  const earned = page.getByRole('button', { name: 'Две публикации', exact: true })
  await expect(earned).toBeVisible()
  await expect(earned.locator('img')).toHaveAttribute('src', /^(blob:|data:image)/)
  await navigate(page, '/admin/settings/badges')
  const row = page.getByRole('group', { name: 'Две публикации', exact: true })
  await row.getByRole('textbox', { name: 'Название бейджа' }).fill('Автор')
  const renamed = page.getByRole('group', { name: 'Автор', exact: true })
  const replacement = await page.evaluate(() => {
    const url = `${window.location.origin}/badges/ten_reactions.svg`
    sessionStorage.setItem('mock_media_url', url)
    return url
  })
  await renamed
    .getByRole('button', { name: 'Заменить изображение', exact: true })
    .locator('..')
    .locator('input[type="file"]')
    .setInputFiles({ name: 'replacement.png', mimeType: 'image/png', buffer: PNG })
  await expect(renamed.locator('img')).toHaveAttribute('src', replacement)
  await renamed.getByRole('button', { name: 'Архивировать', exact: true }).click()
  await renamed.getByRole('spinbutton', { name: 'Порог' }).fill('100')
  await page.getByRole('button', { name: 'Сохранить', exact: true }).click()
  await expect(page.getByText('Настройки сохранены', { exact: true })).toBeVisible()
  await page.evaluate(() => sessionStorage.setItem('mock_articles', '[]'))
  await navigate(page, '/u/anna')
  const preserved = page.getByRole('button', { name: 'Автор', exact: true })
  await expect(preserved).toBeVisible()
  await expect(preserved.locator('img')).toHaveAttribute('src', replacement)
})
