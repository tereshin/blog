import { expect, test } from '@playwright/test'

test('header and mobile navigation preview the tint and black-to-white lightness', async ({
  page,
}) => {
  test.skip((page.viewportSize()?.width ?? 0) >= 768)
  await page.addInitScript(() => localStorage.setItem('mock_viewer', 'superadmin'))
  await page.goto('/admin/settings/general')

  const hue = page.getByRole('slider', { name: 'Оттенок шапки' })
  const lightness = page.getByRole('slider', { name: 'Светлота шапки' })
  const opacity = page.getByRole('slider', { name: 'Непрозрачность шапки' })
  const header = page.getByRole('banner')
  const nav = page.getByRole('navigation', { name: 'Мобильная навигация' })
  await expect(hue).toBeAttached()
  const headerColor = () =>
    header.evaluate((el) => getComputedStyle(el, '::before').backgroundColor)
  const navColor = () => nav.locator('.mobile-navigation-glass').evaluate((el) => getComputedStyle(el).backgroundColor)
  const initial_header = await headerColor()
  const initial_nav = await navColor()
  await hue.press('Home')
  await expect.poll(headerColor).not.toBe(initial_header)
  await expect.poll(navColor).not.toBe(initial_nav)
  await expect
    .poll(() => nav.locator('.mobile-navigation-glass').evaluate((el) => getComputedStyle(el).backdropFilter))
    .toContain('blur(')

  await opacity.press('End')
  await lightness.press('Home')
  const headerLightness = () => header.evaluate(el => {
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Canvas unavailable')
    context.fillStyle = getComputedStyle(el, '::before').backgroundColor
    context.fillRect(0, 0, 1, 1)
    const pixel = context.getImageData(0, 0, 1, 1).data
    return ((pixel[0] ?? 0) + (pixel[1] ?? 0) + (pixel[2] ?? 0)) / (3 * 255)
  })
  await expect.poll(headerLightness).toBeCloseTo(0)
  await lightness.press('End')
  await expect.poll(headerLightness).toBeCloseTo(1)

  await nav.locator('a[href="/discovery"]').click()
  const active = nav.locator('[aria-current="page"]')
  await expect(active).toHaveAttribute('href', '/discovery')
  await expect(active.locator('svg')).toHaveCSS('filter', 'none')
  await expect(nav).toHaveCSS('filter', 'none')
  await expect(nav).toHaveCSS('backdrop-filter', 'none')
  const shadow = nav.locator('.mobile-navigation-shadow')
  await expect(shadow).toHaveCSS('pointer-events', 'none')
  await expect(shadow).toHaveCSS('background-image', /linear-gradient/)
  const color = await active.evaluate(el => getComputedStyle(el).color)
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  await expect(active).toHaveCSS('color', color)
  await expect(active.locator('svg')).toHaveCSS('filter', 'none')
})

test('mobile navigation stays interactive through repeated scrolling', async ({ page }) => {
  test.skip((page.viewportSize()?.width ?? 0) >= 768)
  await page.goto('/')
  const nav = page.getByRole('navigation', { name: 'Мобильная навигация' })
  await expect(page.getByRole('main').getByRole('article').first()).toBeVisible()
  const icon = nav.locator('[aria-current="page"] svg')
  const initial = await icon.evaluate(el => getComputedStyle(el).color)
  for (let index = 0; index < 8; index += 1) {
    await page.evaluate(async direction => {
      for (let frame = 0; frame < 12; frame += 1) {
        window.scrollBy(0, direction * 50)
        await new Promise<void>(resolve => requestAnimationFrame(() => resolve()))
      }
    }, index % 2 ? -1 : 1)
    await expect(icon).toBeVisible()
    await expect(icon).toHaveCSS('filter', 'none')
    await expect(icon).toHaveCSS('color', initial)
  }
  await nav.locator('a[href="/discovery"]').click()
  await expect(nav.locator('[aria-current="page"]')).toHaveAttribute('href', '/discovery')
  await page.screenshot({ path: '/tmp/blog-mobile-' + test.info().project.name + '.png' })
})
