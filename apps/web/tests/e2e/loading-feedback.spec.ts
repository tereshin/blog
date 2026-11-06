import { expect, test } from '@playwright/test'

for (const [path, module_path, api_path, title] of [
  ['/u/reader', 'profile/index.ts', '/v1/profiles/reader', 'Роман Читаев'],
  ['/t/tehnologii', 'topic/index.ts', '/v1/topics/tehnologii', 'Технологии'],
] as const) {
  test(`один скелетон при загрузке страницы и данных: ${path}`, async ({ page }) => {
    test.skip(process.env['E2E_TARGET'] === 'local', 'проверяет отдельную загрузку модулей Vite')
    await page.addInitScript(
      ({ api_path }) => {
        const original_fetch = window.fetch.bind(window)
        window.fetch = async (input, init) => {
          const response = await original_fetch(input, init)
          if (new URL(response.url).pathname === api_path) {
            await new Promise<void>((resolve) =>
              window.addEventListener('release-loading-response', () => resolve(), { once: true }),
            )
          }
          return response
        }
      },
      { api_path },
    )
    // Hold the lazy entry before MSW starts; service-worker passthrough can bypass
    // Playwright interception of the later page-module request.
    await page.route(`**/src/pages/${module_path}*`, async (route) => {
      const response = await route.fetch()
      const source = await response.text()
      await route.fulfill({
        response,
        body:
          `
        function delayedLazy(load) {
          return lazy(async () => {
            await new Promise(resolve => window.addEventListener('load-identity-module', resolve, { once: true }));
            return load();
          });
        }
      ` + source.replace(/\blazy\(/g, 'delayedLazy('),
      })
    })
    const loaded_data = page.waitForResponse(
      (response) => new URL(response.url()).pathname === api_path,
    )
    await page.goto(path, { waitUntil: 'domcontentloaded' })
    const header = page.getByRole('main').locator('.identity-header')
    await expect(header).toBeVisible()
    const shape = () =>
      header.evaluate((element) =>
        [element, ...element.querySelectorAll('.skeleton')].map((part) => {
          const { x, y, width, height } = part.getBoundingClientRect()
          return { x, y, width, height }
        }),
      )
    const before = await shape()
    expect(before.length).toBeGreaterThan(1)
    await page.evaluate(() => window.dispatchEvent(new Event('load-identity-module')))
    await loaded_data
    await expect(page.getByRole('heading', { name: title, exact: true })).toHaveCount(0)
    expect(await shape()).toEqual(before)
    await page.evaluate(() => window.dispatchEvent(new Event('release-loading-response')))
    await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible()
  })
}

test('реакции блокируются без прозрачности, а анимация остаётся видимой', async ({ page }) => {
  test.skip(process.env['E2E_TARGET'] === 'local', 'использует фикстурную статью')
  await page.addInitScript(() => {
    localStorage.setItem('mock_viewer', 'member')
    const original_fetch = window.fetch.bind(window)
    window.fetch = async (input, init) => {
      const response = await original_fetch(input, init)
      if (new URL(response.url).pathname === '/v1/reactions' && init?.method === 'POST') {
        await new Promise<void>((resolve) =>
          window.addEventListener('release-reaction-response', () => resolve(), { once: true }),
        )
      }
      return response
    }
  })
  await page.goto('/')
  const card = page.getByRole('main').getByRole('article').first()
  const reaction = card.getByRole('button', { name: /^Сердце(?: \d+)?$/ })
  await expect(reaction).toBeVisible()
  await expect(reaction).toHaveCSS('opacity', '1')
  await reaction.click()
  await expect(reaction).toBeDisabled()
  await expect(reaction).toHaveCSS('opacity', '1')
  await expect(card.getByRole('button', { name: 'Добавить реакцию', exact: true })).toBeDisabled()
  await expect(card.getByRole('button', { name: 'Добавить реакцию', exact: true })).toHaveCSS(
    'opacity',
    '1',
  )
  await expect(card.locator('.reaction-pill[data-burst="true"]')).toBeVisible()
  await page.evaluate(() => window.dispatchEvent(new Event('release-reaction-response')))
  await expect(reaction).toBeEnabled()
  await expect(reaction).toHaveAttribute('aria-pressed', 'true')
})
