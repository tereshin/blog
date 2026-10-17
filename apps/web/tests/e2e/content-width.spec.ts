import { expect, test } from '@playwright/test'

for (const [path, content_width] of [['/', 640], ['/admin/pages', 848]] as const) {
  test(`shell columns match the header for ${content_width}px content`, async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('mock_viewer', 'superadmin'))
    // MaintenanceGate also renders a <main> while the session is loading.
    const main = page.locator('.shell-grid > main')
    for (const width of [390, 768, 1024, 1280, 1420, 1600]) {
      await page.setViewportSize({ width, height: 900 })
      await page.goto(path)
      await expect(main).toBeVisible()
      const side_width = width >= 1280 ? 572 : width >= 768 ? 236 : 0
      await expect
        .poll(async () => (await main.boundingBox())?.width)
        .toBe(Math.min(content_width, width - side_width))
      if (width >= 768) {
        const pairs: [string, string][] = [
          ['.site-header-brand', '[data-shell-scroll="left"]'],
          ['.site-header-center', 'main'],
          ...(width >= 1280 ? [['.site-header-actions', 'main + aside'] as [string, string]] : []),
        ]
        for (const [header, body] of pairs) {
          const header_box = await page.locator(header).boundingBox()
          const body_box = await page.locator(body).boundingBox()
          expect(header_box?.x).toBe(body_box?.x)
          expect(header_box?.width).toBe(body_box?.width)
        }
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width)
    }
  })
}
