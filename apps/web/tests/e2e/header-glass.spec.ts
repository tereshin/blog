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
  const navColor = () => nav.evaluate((el) => getComputedStyle(el, '::before').backgroundColor)
  const initial_header = await headerColor()
  const initial_nav = await navColor()
  await hue.press('Home')
  await expect.poll(headerColor).not.toBe(initial_header)
  await expect.poll(navColor).not.toBe(initial_nav)
  await expect
    .poll(() => nav.evaluate((el) => getComputedStyle(el, '::before').backdropFilter))
    .toContain('blur(')

  await opacity.press('End')
  await lightness.press('Home')
  const headerLightness = async () => Number((await headerColor()).match(/^oklch\(([\d.]+)/)?.[1])
  await expect.poll(headerLightness).toBeCloseTo(0)
  await lightness.press('End')
  await expect.poll(headerLightness).toBeCloseTo(1)

  await nav.locator('a[href="/discovery"]').click()
  const active = nav.locator('[aria-current="page"]')
  await expect(active).toHaveAttribute('href', '/discovery')
  await expect(active.locator('svg')).toHaveCSS('filter', /drop-shadow/)
})
