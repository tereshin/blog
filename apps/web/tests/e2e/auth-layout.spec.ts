import { expect, test } from '@playwright/test'

test('auth focus outlines have space and the final provider is reachable on a short screen', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 480 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  await page.getByRole('banner').getByRole('button', { name: 'Войти', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await expect.poll(() => dialog.boundingBox()).toEqual({ x: 0, y: 0, width: 390, height: 480 })
  await expect(dialog).toHaveCSS('border-radius', '0px')
  const email = dialog.getByLabel('Почта', { exact: true })
  await email.focus()
  const spacing = await email.evaluate((node) => {
    const field = node.closest('.form-control') ?? node
    const viewport = node.closest('.auth-transition')
    if (!viewport) throw new Error('Missing auth viewport')
    const bounds = field.getBoundingClientRect(),
      clip = viewport.getBoundingClientRect()
    return { left: bounds.left - clip.left, right: clip.right - bounds.right }
  })
  expect(spacing.left).toBeGreaterThanOrEqual(7)
  expect(spacing.right).toBeGreaterThanOrEqual(7)
  const last_provider = dialog.getByRole('button', { name: 'Войти через GitHub', exact: true })
  await last_provider.scrollIntoViewIfNeeded()
  const bounds = await last_provider.boundingBox()
  const clip = await dialog.locator('.auth-transition').boundingBox()
  if (!bounds || !clip) throw new Error('Missing auth bounds')
  expect(bounds.y).toBeGreaterThanOrEqual(clip.y)
  expect(bounds.y + bounds.height).toBeLessThanOrEqual(clip.y + clip.height - 4)
  await expect(dialog.getByRole('button', { name: 'Закрыть', exact: true })).toBeInViewport()
  // React Aria updates this inherited value when the on-screen keyboard changes the visual viewport.
  await dialog.evaluate((node) => {
    node.closest<HTMLElement>('.modal__backdrop')?.style.setProperty('--visual-viewport-height', '300px')
  })
  await expect.poll(() => dialog.boundingBox()).toEqual({ x: 0, y: 0, width: 390, height: 300 })
  await email.focus()
  await expect(email).toBeInViewport()
  await expect(dialog.getByRole('button', { name: 'Закрыть', exact: true })).toBeInViewport()
})

test('local Inter is available to interface text without Google Fonts', async ({ page }) => {
  await page.route('https://fonts.googleapis.com/**', (route) => route.abort())
  await page.goto('/')
  await expect(page.getByRole('banner')).toBeVisible()
  const fonts = await page.evaluate(async () => {
    const loaded = await document.fonts.load('16px "Inter Variable"', 'Почта Email')
    return { loaded: loaded.length, family: getComputedStyle(document.body).fontFamily }
  })
  expect(fonts.loaded).toBeGreaterThan(0)
  expect(fonts.family).toContain('Inter Variable')
})
