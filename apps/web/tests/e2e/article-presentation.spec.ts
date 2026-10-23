import { expect, test } from '@playwright/test'
import type { Locator } from '@playwright/test'

async function typography(locator: Locator) {
  return locator.evaluate((element) => {
    const style = getComputedStyle(element)
    return { size: style.fontSize, height: style.lineHeight, weight: style.fontWeight }
  })
}

test('размеры текста, заголовков и списков совпадают в редакторе, превью и статье', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('mock_viewer', 'member')
    sessionStorage.setItem('mock_articles', JSON.stringify([{
      id: '7a1c2d30-1111-4a11-8a11-000000000099',
      author_id: '0b3a4c50-3333-4c33-8c33-000000000005',
      author_name: 'Роман Читаев', author_slug: 'reader',
      title: 'Единая типографика', slug: 'type-scale',
      topic_id: '5f0f6a52-0d8b-4f6e-a8b1-000000000001',
      visibility: 'public', comments_enabled: true, status: 'published',
      published_at: '2026-10-23T09:00:00.000Z',
      blocks: { blocks: [
        { id: 'intro', type: 'paragraph', data: { text: 'Начало <b>статьи</b>.' } },
        { id: 'h2', type: 'header', data: { text: 'Второй блок', level: 2 } },
        { id: 'h3', type: 'header', data: { text: 'Подзаголовок', level: 3 } },
        { id: 'h4', type: 'header', data: { text: 'Малый заголовок', level: 4 } },
        { id: 'list', type: 'list', data: { style: 'unordered', items: [{ content: 'Пункт списка', items: [] }] } },
      ] },
    }]))
  })
  await page.goto('/write/7a1c2d30-1111-4a11-8a11-000000000099')
  await expect(page.locator('[data-editor="ready"]')).toBeVisible({ timeout: 60_000 })
  const editor = {
    title: await typography(page.locator('.article-editor-title')),
    paragraph: await typography(page.locator('.ce-paragraph').first()),
    h2: await typography(page.locator('h2.ce-header')),
    h3: await typography(page.locator('h3.ce-header')),
    h4: await typography(page.locator('h4.ce-header')),
    list: await typography(page.locator('.cdx-list__item-content').first()),
  }
  expect(editor.paragraph.size).toBe((page.viewportSize()?.width ?? 0) <= 640 ? '16px' : '18px')

  await page.getByRole('button', { name: 'Параметры статьи' }).click()
  await page.getByRole('button', { name: 'Предпросмотр', exact: true }).click()
  const preview = page.locator('.article-editor-panel .document-content')
  await expect(preview).toBeVisible()
  for (const [key, selector] of [['paragraph', 'p'], ['h2', 'h2'], ['h3', 'h3'], ['h4', 'h4'], ['list', 'li']] as const) {
    expect(await typography(preview.locator(selector).first())).toEqual(editor[key])
  }
  expect(await typography(page.locator('.article-editor-panel').getByRole('heading', { name: 'Единая типографика', exact: true }))).toEqual(editor.title)

  await page.goto('/p/type-scale')
  const body = page.locator('.document-content')
  await expect(body.locator('li')).toBeVisible()
  for (const [key, selector] of [['paragraph', 'p'], ['h2', 'h2'], ['h3', 'h3'], ['h4', 'h4'], ['list', 'li']] as const) {
    expect(await typography(body.locator(selector).first())).toEqual(editor[key])
  }
  expect(await typography(page.getByRole('heading', { level: 1, name: 'Единая типографика' }))).toEqual(editor.title)

  await page.goto('/')
  const card = page.getByRole('article').filter({ has: page.getByRole('heading', { name: 'Единая типографика', exact: true }) })
  await expect(card.locator('.document-content > *')).toHaveCount(2)
  await expect(card.locator('.document-content p b')).toHaveText('статьи')
  expect(await typography(card.locator('.document-content p'))).toEqual(editor.paragraph)
  expect(await typography(card.locator('.document-content h2'))).toEqual(editor.h2)
  expect(await typography(card.locator('h2[id^="article-title-"]'))).toEqual({ size: '20px', height: '27.5px', weight: '600' })
})

test('выбор реакции запускает разлёт и перелистывание цифры, затем частицы исчезают', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('mock_viewer', 'member'))
  await page.goto('/')
  const card = page.getByRole('main').getByRole('article').nth(1)
  const heart = card.getByRole('button', { name: 'Сердце 2', exact: true })
  await expect(heart).toBeEnabled()
  await expect(card.locator('.reaction-burst')).toHaveCount(0)
  await heart.click()
  await expect(card.getByRole('button', { name: 'Сердце 3', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await expect(card.locator('.reaction-burst__particle')).toHaveCount(4)
  await expect(card.locator('.animated-count__in[data-digit="3"]')).toHaveCount(1)
  await expect(card.locator('.reaction-burst')).toHaveCount(0, { timeout: 3000 })

  await page.emulateMedia({ reducedMotion: 'reduce' })
  await card.getByRole('button', { name: 'Сердце 3', exact: true }).click()
  await expect(card.getByRole('button', { name: 'Сердце 2', exact: true })).toHaveAttribute('aria-pressed', 'false')
  expect(await card.locator('.animated-count__in').first().evaluate((element) => getComputedStyle(element).animationName)).toBe('none')
})
