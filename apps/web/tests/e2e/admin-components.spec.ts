import { expect, test } from '@playwright/test'

test('superadmin creates a topic from navigation and edits its address and status', async ({
  page,
}) => {
  test.skip((page.viewportSize()?.width ?? 0) < 768, 'новая тема в левой колонке от 768px')
  await page.addInitScript(() => localStorage.setItem('mock_viewer', 'superadmin'))
  await page.goto('/')
  const nav = page.getByRole('navigation', { name: 'Навигация', exact: true })
  await nav.getByRole('button', { name: 'Новая тема' }).click()
  const dialog = page.getByRole('dialog', { name: 'Новая тема' })
  await dialog.getByLabel('Название', { exact: true }).fill('Новая тема')
  await dialog.getByLabel('Описание', { exact: true }).fill('Описание новой темы')
  await dialog.getByLabel('Адрес', { exact: true }).fill('new-topic')
  await dialog.getByRole('button', { name: 'Сохранить', exact: true }).click()
  await expect(page).toHaveURL(/\/t\/new-topic$/)
  await expect(page.getByRole('heading', { name: 'Новая тема', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Настроить тему', exact: true }).click()
  const settings = page.getByRole('dialog', { name: 'Настроить тему' })
  await settings.getByLabel('Адрес', { exact: true }).fill('renamed-topic')
  await settings.getByRole('button', { name: 'Сохранить', exact: true }).click()
  await expect(page).toHaveURL(/\/t\/renamed-topic$/)
  await page.goto('/admin/topics')
  await expect(page.getByRole('grid')).toBeVisible()
  const row = page.getByRole('row').filter({ hasText: 'Новая тема' })
  await row.getByRole('button', { name: 'В архив', exact: true }).click()
  await expect(row).toContainText('В архиве')
  await row.getByRole('button', { name: 'Вернуть', exact: true }).click()
  await expect(row).toContainText('Активна')
})

test('article report dismissal removes it from open results and keeps content published', async ({
  page,
}) => {
  await page.addInitScript(() => localStorage.setItem('mock_viewer', 'admin'))
  await page.goto('/admin/moderation/articles')
  const table = page.getByRole('grid')
  await expect(table.getByRole('link', { name: /^Статья 1:/ })).toBeVisible()
  await table.getByRole('button', { name: 'Отклонить жалобу' }).click()
  await expect(table.getByRole('link', { name: /^Статья 1:/ })).toHaveCount(0)
  await page.getByRole('button', { name: /^Новые Статус$/ }).click()
  await page.getByRole('option', { name: 'Обработанные', exact: true }).click()
  await expect(table.getByRole('link', { name: /^Статья 1:/ })).toBeVisible()
  await expect(page).toHaveURL(/status=reviewed/)
  await page.goto('/admin/moderation/find?q=statya-1')
  await expect(page.getByRole('grid').getByRole('link', { name: /^Статья 1:/ })).toBeVisible()
})

test('topic management is available only to superadmin', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('mock_viewer', 'admin'))
  await page.goto('/t/tehnologii')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Настроить тему' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Новая тема' })).toHaveCount(0)
})

test('revealing seen posts removes the banner immediately', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('main').getByRole('article').first()).toBeVisible()
  const title = await page.evaluate(async () => {
    const response = await fetch('/v1/feed?mode=popular')
    const data = (await response.json()) as { items: { id: string; title: string }[] }
    const id = data.items[0]?.id
    if (!id) throw new Error('Missing article')
    await fetch('/v1/feed-seen', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ feed_key: 'popular', article_id: id }),
    })
    return data.items[0]?.title ?? ''
  })
  if ((page.viewportSize()?.width ?? 0) < 768) {
    await page.evaluate(() => {
      const current = window.history.state as { idx?: number } | null
      const idx = typeof current?.idx === 'number' ? current.idx + 1 : 1
      const key = Math.random().toString(36).slice(2, 10)
      window.history.pushState({ usr: null, key, idx }, '', '/popular')
      window.dispatchEvent(new PopStateEvent('popstate'))
    })
    await expect(page).toHaveURL('/popular')
  } else {
    await page
      .getByRole('navigation', { name: 'Навигация', exact: true })
      .getByRole('link', { name: 'Популярное', exact: true })
      .click()
  }
  const banner = page.getByRole('button', { name: /Скрыт.*просмотренн/ })
  await expect(banner).toBeVisible()
  await banner.click()
  await expect(page.getByRole('button', { name: 'Убрать полосу' })).toBeVisible()
  await expect(
    page.getByRole('main').getByRole('heading', { name: title, exact: true }),
  ).toBeVisible()
})

test('long moderation table loads all pages and virtualizes the rows', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('mock_viewer', 'admin')
    sessionStorage.setItem(
      'mock_article_reports',
      JSON.stringify(
        Array.from({ length: 150 }, (_, index) => ({
          id: `00000000-0000-4000-8000-${String(5000 + index).padStart(12, '0')}`,
          article_id: '9b2e3f40-2222-4b22-8b22-000000000001',
          reporter_id: `00000000-0000-4000-8000-${String(6000 + index).padStart(12, '0')}`,
          created_at: '2026-10-12T12:00:00.000Z',
          status: 'open',
        })),
      ),
    )
  })
  await page.goto('/admin/moderation/articles')
  const grid = page.getByRole('grid')
  await expect(grid.getByRole('row')).toHaveCount(51)
  await page.getByRole('button', { name: 'Показать ещё', exact: true }).click()
  await expect(grid.getByRole('row')).toHaveCount(101)
  await page.getByRole('button', { name: 'Показать ещё', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Показать ещё', exact: true })).toHaveCount(0)
  await expect(grid.getByRole('columnheader').first()).toBeVisible()
  await expect(grid.getByRole('link').first()).toBeVisible()
  expect(await grid.getByRole('row').count()).toBeLessThan(100)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

test('two logos and favicon settings persist and update site metadata', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('mock_viewer', 'superadmin')
    sessionStorage.setItem(
      'mock_site',
      JSON.stringify({
        settings: {
          logo_url: 'data:image/png;base64,light',
          logo_dark_url: 'data:image/png;base64,dark',
          favicon: {
            png: 'https://files.test/icon.png',
            svg: null,
            ico: null,
            apple: null,
            manifest: null,
          },
        },
        topics: [],
      }),
    )
  })
  await page.goto('/admin/settings/general')
  await expect(
    page.getByRole('main').getByText('Логотип светлой темы', { exact: true }),
  ).toBeVisible()
  await expect(
    page.getByRole('main').getByText('Логотип тёмной темы', { exact: true }),
  ).toBeVisible()
  await expect(page.getByRole('banner').locator('a[href="/"] img')).toHaveAttribute(
    'src',
    'data:image/png;base64,dark',
  )
  await expect(page.locator('head link[rel="icon"][sizes="96x96"]')).toHaveAttribute(
    'href',
    '/favicon-96x96.png?v=icon.png',
  )
  if ((page.viewportSize()?.width ?? 0) >= 768) {
    await page
      .getByRole('navigation', { name: 'Навигация', exact: true })
      .getByRole('link', { name: 'Тёмная тема', exact: true })
      .click()
    await page.getByRole('menu').getByText('Светлая', { exact: true }).click()
    await expect(page.getByRole('banner').locator('a[href="/"] img')).toHaveAttribute(
      'src',
      'data:image/png;base64,light',
    )
  }
  await page.getByRole('main').getByRole('button', { name: 'Удалить: PNG 96×96' }).click()
  await page.getByRole('button', { name: 'Сохранить', exact: true }).click()
  await expect(page.locator('head link[rel="icon"][sizes="96x96"]')).toHaveCount(0)
})

test('cover color picker synchronizes palette and HEX field', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('mock_viewer', 'superadmin'))
  await page.goto('/admin/settings/covers')
  await page.getByRole('button', { name: 'Цвет заливки', exact: true }).click()
  await page.getByRole('option', { name: '#0485F7', exact: true }).click()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('button', { name: 'Цвет заливки', exact: true })).toContainText(
    '#0485F7',
  )
  await page.getByRole('button', { name: 'Сохранить', exact: true }).click()
  await expect
    .poll(() =>
      page.evaluate(
        async () =>
          (await (await fetch('/v1/settings/admin')).json()).social_cover.background_color,
      ),
    )
    .toBe('#0485F7')
})

test('topic images are edited directly from the header, outside the settings dialog', async ({
  page,
}) => {
  await page.addInitScript(() => localStorage.setItem('mock_viewer', 'superadmin'))
  await page.goto('/t/tehnologii')
  const header = page.getByRole('main').locator('.identity-header')
  const image = {
    name: 'topic.png',
    mimeType: 'image/png',
    buffer: Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      'base64',
    ),
  }
  const avatar_chooser = page.waitForEvent('filechooser')
  await header.getByRole('button', { name: 'Изменить аватар' }).click()
  await (await avatar_chooser).setFiles(image)
  await expect
    .poll(() =>
      page.evaluate(async () => (await (await fetch('/v1/topics/tehnologii')).json()).avatar_url),
    )
    .toMatch(/^blob:/)
  const cover_chooser = page.waitForEvent('filechooser')
  await header.getByRole('button', { name: 'Добавить обложку' }).click()
  await (await cover_chooser).setFiles(image)
  await expect
    .poll(() =>
      page.evaluate(async () => (await (await fetch('/v1/topics/tehnologii')).json()).cover_url),
    )
    .toMatch(/^blob:/)
  await expect(header.locator(':scope > div').first().locator('img')).toHaveAttribute(
    'src',
    /^blob:/,
  )
  await page.getByRole('button', { name: 'Настроить тему' }).click()
  await expect(page.getByRole('dialog').locator('input[type="file"]')).toHaveCount(0)
})

test('moderation labels and controls share typography, gaps and row alignment', async ({
  page,
}) => {
  await page.addInitScript(() => localStorage.setItem('mock_viewer', 'admin'))
  for (const route of ['articles', 'comments', 'hidden', 'find']) {
    await page.goto(`/admin/moderation/${route}`)
    const grid = page.locator('.moderation-filters')
    await expect(grid.locator('label').first()).toBeVisible()
    const metrics = await grid.evaluate((element) =>
      [...element.children]
        .filter((field) => field.tagName !== 'TEMPLATE')
        .map((field) => {
          const label = field.querySelector('.field-label'),
            control = field.querySelector('input,button')
          if (!label || !control) throw new Error('Missing filter parts')
          const label_style = getComputedStyle(label),
            label_rect = label.getBoundingClientRect(),
            rect = control.getBoundingClientRect()
          return {
            weight: label_style.fontWeight,
            font: label_style.fontSize,
            line: label_style.lineHeight,
            gap: Math.round(rect.top - label_rect.bottom),
            height: Math.round(rect.height),
            top: Math.round(rect.top),
            label_top: Math.round(label_rect.top),
          }
        }),
    )
    expect(
      new Set(
        metrics.map(({ weight, font, line, gap, height }) =>
          JSON.stringify({ weight, font, line, gap, height }),
        ),
      ).size,
    ).toBe(1)
    for (const metric of metrics) expect(metric.gap).toBe(8)
    for (const metric of metrics) expect(metric.height).toBe(40)
    for (const row_top of new Set(metrics.map((metric) => metric.label_top)))
      expect(
        new Set(
          metrics.filter((metric) => metric.label_top === row_top).map((metric) => metric.top),
        ).size,
      ).toBe(1)
  }
})
