import { expect, test } from '@playwright/test'

test.describe('секции сайдбара', () => {
  test.use({ viewport: { width: 1280, height: 900 } })

  test('своя секция сворачивается и прячет системную тему', async ({ page }) => {
    await page.goto('/')
    const nav = page.getByRole('navigation', { name: 'Навигация' })
    const topics = nav.getByRole('region', { name: 'Темы' })
    const custom = nav.getByRole('region', { name: 'О площадке' })
    await expect(topics.getByRole('button', { name: 'Темы' })).toHaveAttribute('aria-expanded', 'true')
    await expect(custom.getByRole('link', { name: 'О проекте' })).toBeVisible()
    await expect(custom.getByRole('link', { name: 'Системная тема', exact: true })).toBeVisible()
    await expect(topics.getByRole('link', { name: 'Системная тема', exact: true })).toHaveCount(0)
    await custom.getByRole('button', { name: 'О площадке' }).click()
    await expect(custom.getByRole('button', { name: 'О площадке' })).toHaveAttribute('aria-expanded', 'false')
    await expect(custom.getByRole('link', { name: 'О проекте' })).toHaveCount(0)
    await expect(custom.getByRole('link', { name: 'Системная тема', exact: true })).toHaveCount(0)
    await page.reload()
    await expect(nav.getByRole('button', { name: 'О площадке' })).toHaveAttribute('aria-expanded', 'false')
    await nav.getByRole('button', { name: 'О площадке' }).click()
    await custom.getByRole('link', { name: 'О проекте' }).click()
    await expect(page).toHaveURL('/pages/welcome-page')
    await expect(nav.getByRole('link', { name: 'О проекте' })).toHaveAttribute('aria-current', 'page')
  })

  test('без своих секций системная тема остаётся в темах', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('mock_nav_sections', 'empty'))
    await page.goto('/')
    const topics = page.getByRole('navigation', { name: 'Навигация' }).getByRole('region', { name: 'Темы' })
    await expect(topics.getByRole('link', { name: 'Системная тема', exact: true })).toBeVisible()
    await expect(page.getByRole('region', { name: 'О площадке' })).toHaveCount(0)
    await topics.getByRole('button', { name: 'Темы' }).click()
    await expect(topics.getByRole('link', { name: 'Системная тема', exact: true })).toHaveCount(0)
  })

  test('старый адрес открывает левую вкладку единых настроек', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('mock_viewer', 'superadmin'))
    await page.goto('/admin/sections')
    await expect(page).toHaveURL('/admin/sidebars?side=left')
    await expect(page.getByRole('tab', { name: 'Левый' })).toHaveAttribute('aria-selected', 'true')
  })
})
