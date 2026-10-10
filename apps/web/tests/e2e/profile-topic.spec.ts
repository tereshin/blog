import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

test.describe('Общий каркас профиля и темы', () => {
  test('шапки совпадают по размерам, вкладки компактны, страницы доступны', async ({ page }) => {
    const page_errors: string[] = []
    page.on('pageerror', (error) => page_errors.push(error.message))
    const sizes: { cover_height: number; avatar_width: number }[] = []
    for (const [route, title] of [
      ['/u/anna', 'Анна Авторова'],
      ['/t/tehnologii', 'Технологии'],
    ] as const) {
      await page.goto(route)
      const main = page.getByRole('main')
      await expect(main.getByRole('heading', { name: title, exact: true })).toBeVisible()
      const header = main.locator('.identity-header')
      const cover = await header.locator(':scope > div').first().boundingBox()
      const avatar = await header.locator('.avatar').first().boundingBox()
      expect(cover).not.toBeNull()
      expect(avatar).not.toBeNull()
      if (!cover || !avatar) throw new Error('Не найдены обложка и аватар')
      sizes.push({ cover_height: cover.height, avatar_width: avatar.width })
      expect(avatar.y).toBeLessThan(cover.y + cover.height)
      expect(avatar.y + avatar.height).toBeGreaterThan(cover.y + cover.height)
      const tab = await main.getByRole('tab', { name: 'Посты', exact: true }).boundingBox()
      if (!tab) throw new Error('Не найдена вкладка постов')
      expect(tab.width).toBeLessThan(100)
      expect(tab.x).toBeCloseTo(avatar.x, 0)
      const first_article = await main.getByRole('article').first().boundingBox()
      const header_box = await header.boundingBox()
      if (!first_article || !header_box) throw new Error('Не найдены шапка и пост')
      expect(first_article.width).toBeCloseTo(header_box.width, 0)
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      ).toBe(true)
      const results = await new AxeBuilder({ page }).include('main').analyze()
      expect(
        results.violations.filter(
          (item) => item.impact === 'serious' || item.impact === 'critical',
        ),
      ).toEqual([])
    }
    expect(sizes[0]).toEqual(sizes[1])
    expect(page_errors).toEqual([])
  })

  test('сортировка постов и комментариев передаётся серверу и сохраняется между вкладками', async ({
    page,
  }) => {
    await page.goto('/u/reader')
    await page.getByRole('main').getByRole('link', { name: 'Свежее', exact: true }).click()
    await expect(page.getByRole('menuitemradio', { name: 'Свежее' })).toHaveAttribute(
      'aria-checked',
      'true',
    )
    const posts_response = page.waitForResponse(
      (response) =>
        response.url().includes('/profiles/reader/articles') &&
        response.url().includes('sort=popular'),
    )
    await page.getByRole('menuitemradio', { name: 'Популярное' }).click()
    expect((await posts_response).ok()).toBe(true)
    await expect(page.getByRole('main').getByRole('link', { name: 'Популярное', exact: true })).toBeVisible()
    const comments_response = page.waitForResponse(
      (response) =>
        response.url().includes('/comments?') && response.url().includes('sort=popular'),
    )
    await page.getByRole('tab', { name: 'Комментарии', exact: true }).click()
    expect((await comments_response).ok()).toBe(true)
    await expect(page.getByText('Главное — стабильный порядок.')).toBeVisible()
    await page.getByRole('tab', { name: 'Посты', exact: true }).click()
    await expect(page.getByRole('main').getByRole('link', { name: 'Популярное', exact: true })).toBeVisible()
    await expect(page.getByRole('main').getByRole('article')).toBeVisible()
  })

  test('пост профиля обновляет реакции и закладки и раскрывает полный текст', async ({ page }) => {
    await page.addInitScript(() => window.localStorage.setItem('mock_viewer', 'member'))
    await page.goto('/u/reader')
    const article = page.getByRole('main').getByRole('article')
    await expect(article).toBeVisible()
    const bookmarked = page.waitForResponse(
      (response) => response.url().includes('/bookmarks/') && response.request().method() === 'PUT',
    )
    await article.getByRole('button', { name: 'В закладки', exact: true }).click()
    const bookmark_data = (await (await bookmarked).json()) as { bookmark_count: number }
    await expect(article.getByRole('button', { name: 'Убрать из закладок' })).toHaveText(
      String(bookmark_data.bookmark_count),
    )
    await article.getByRole('button', { name: 'Добавить реакцию' }).click()
    const reacted = page.waitForResponse(
      (response) => response.url().endsWith('/reactions') && response.request().method() === 'POST',
    )
    await page.getByRole('menuitem', { name: 'Сердце', exact: true }).click()
    const reaction_data = (await (await reacted).json()) as { reaction_counts: { heart: number } }
    const reaction = article.getByRole('button', {
      name: `Сердце ${reaction_data.reaction_counts.heart}`,
      exact: true,
    })
    await expect(reaction).toHaveAttribute('aria-pressed', 'true')
    await page.getByRole('tab', { name: 'Комментарии', exact: true }).click()
    await expect(page.getByText('Главное — стабильный порядок.')).toBeVisible()
    await page.getByRole('tab', { name: 'Посты', exact: true }).click()
    await expect(reaction).toHaveAttribute('aria-pressed', 'true')
    await expect(article.getByRole('button', { name: 'Убрать из закладок' })).toHaveText(
      String(bookmark_data.bookmark_count),
    )
    await article.getByRole('link', { name: 'Показать полностью' }).click()
    await expect(article.getByText('Полный текст статьи для проверки раскрытия.')).toBeVisible()
    await article.getByRole('link', { name: 'Свернуть' }).click()
    await expect(article.getByText('Полный текст статьи для проверки раскрытия.')).toHaveCount(0)
  })

  test('в профиле редактируются имя, описание и адрес, настройки и выбор статуса без иконок скрыты', async ({ page }) => {
    await page.addInitScript(() => window.localStorage.setItem('mock_viewer', 'member'))
    await page.goto('/u/reader')
    await expect(page.getByRole('button', { name: 'Настройки', exact: true })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Выбрать статус', exact: true })).toHaveCount(0)
    await page.getByRole('button', { name: 'Редактировать', exact: true }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await expect(dialog.locator('input[type="file"]')).toHaveCount(0)
    await dialog.getByLabel('Имя', { exact: true }).fill('Роман Новый')
    await dialog.getByLabel('Описание', { exact: true }).fill('Новое описание')
    await dialog.getByRole('textbox', { name: /^Короткий адрес/ }).fill('new-reader')
    await dialog.getByRole('button', { name: 'Сохранить', exact: true }).click()
    await expect(dialog).toHaveCount(0)
    await expect(page).toHaveURL(/\/u\/new-reader$/)
    await expect(page.getByRole('heading', { name: 'Роман Новый', exact: true })).toBeVisible()
    await expect(page.getByText('Новое описание', { exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Меню учётной записи' }).click()
    await expect(page.getByRole('menuitem', { name: 'Роман Новый', exact: true })).toBeVisible()
    await page.keyboard.press('Escape')
  })

  test('аватар и обложка загружаются и сохраняются со страницы профиля', async ({ page }) => {
    await page.addInitScript(() => window.localStorage.setItem('mock_viewer', 'member'))
    await page.goto('/u/reader')
    const header = page.getByRole('main').locator('.identity-header')
    await expect(header.getByRole('button', { name: 'Редактировать', exact: true })).toBeVisible()
    const image = { name: 'avatar.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64') }
    for (const field of ['cover_url', 'avatar_url']) {
      const saved = page.waitForResponse((response) => response.url().endsWith('/v1/profiles/me') && response.request().method() === 'PUT')
      await header.locator('input[type="file"]').nth(field === 'cover_url' ? 0 : 1).setInputFiles(image)
      const response = await saved
      expect(response.ok()).toBe(true)
      expect(Object.keys(response.request().postDataJSON())).toEqual([field])
    }
    await expect(header.locator('img')).toHaveCount(2)
    await expect(page.getByRole('banner').getByRole('img', { name: 'Роман Читаев', exact: true })).toBeVisible()
    const accessibility = await new AxeBuilder({ page }).include('main').analyze()
    expect(accessibility.violations.filter((item) => item.impact === 'serious' || item.impact === 'critical')).toEqual([])
  })

  test('наведение на всю аватарку показывает камеру, клик открывает выбор файла', async ({ page }) => {
    const page_errors: string[] = []
    page.on('pageerror', (error) => page_errors.push(error.message))
    await page.addInitScript(() => window.localStorage.setItem('mock_viewer', 'member'))
    await page.goto('/u/reader')
    const header = page.getByRole('main').locator('.identity-header')
    const trigger = header.getByRole('button', { name: 'Изменить аватар', exact: true })
    await expect(trigger).toBeVisible()
    const avatar_box = await header.locator('.avatar').boundingBox()
    const button_box = await trigger.boundingBox()
    if (!avatar_box || !button_box) throw new Error('Не найдены аватар и кнопка загрузки')
    expect(button_box.width).toBeCloseTo(avatar_box.width, 0)
    expect(button_box.height).toBeCloseTo(avatar_box.height, 0)
    const camera = trigger.locator('svg')
    await page.mouse.move(0, 0)
    await expect(camera).toHaveCSS('opacity', '0')
    await trigger.hover()
    await expect(camera).toHaveCSS('opacity', '1')
    await expect(trigger).toHaveCSS('background-color', /(?:rgba\(0, 0, 0, 0\.5\)|oklab\(0 0 0 \/ 0\.5\))/)
    const chooser_opened = page.waitForEvent('filechooser')
    // Клик по краю проверяет всю площадь аватара, а не только иконку в центре.
    await trigger.click({ position: { x: button_box.width / 2, y: 8 } })
    const chooser = await chooser_opened
    const saved = page.waitForResponse((response) => response.url().endsWith('/v1/profiles/me') && response.request().method() === 'PUT')
    await chooser.setFiles({ name: 'avatar.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64') })
    const response = await saved
    expect(response.ok()).toBe(true)
    expect(Object.keys(response.request().postDataJSON())).toEqual(['avatar_url'])
    await expect(header.getByRole('img', { name: 'Роман Читаев', exact: true })).toBeVisible()
    expect(page_errors).toEqual([])
  })

  test('статус выбирается из загруженных админом иконок и сбрасывается', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('mock_viewer', 'member')
      window.sessionStorage.setItem('mock_site', JSON.stringify({ settings: { profile_status_icons: [{ id: '44444444-4444-4444-8444-444444444444', label: 'В отпуске', image_url: `${window.location.origin}/badges/one_year.svg` }] }, topics: [] }))
    })
    await page.goto('/u/reader')
    await page.getByRole('button', { name: 'Выбрать статус', exact: true }).click()
    await page.getByRole('menuitemradio', { name: 'В отпуске', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Выбрать статус', exact: true }).getByRole('img', { name: 'В отпуске' })).toBeVisible()
    await page.getByRole('button', { name: 'Выбрать статус', exact: true }).click()
    await page.getByRole('menuitemradio', { name: 'Без статуса', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Выбрать статус', exact: true }).getByRole('img')).toHaveCount(0)
  })
})
