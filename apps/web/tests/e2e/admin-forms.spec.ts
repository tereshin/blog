import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

const SCREENS = [
  'general',
  'access',
  'layout',
  'reactions',
  'status-icons',
  'seo',
  'publisher',
  'covers',
] as const

test('формы внутри одной карточки: поля, состояния и адаптивность', async ({ page }, info) => {
  test.setTimeout(90_000)
  await page.addInitScript(() => localStorage.setItem('mock_viewer', 'superadmin'))
  await page.goto('/admin/settings/general')
  if (info.project.name === 'wide-light') {
    await page
      .getByRole('navigation', { name: 'Навигация', exact: true })
      .getByRole('link', { name: 'Тёмная тема', exact: true })
      .click()
    await page.getByRole('menu').getByText('Светлая', { exact: true }).click()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  }
  const main = page.getByRole('main')
  const name = main.getByRole('textbox', { name: 'Название', exact: true })
  await expect(name).toHaveValue('Блог')
  await expect(name).toHaveAccessibleDescription(/Осталось символов: 96/)
  await expect(main.getByRole('heading', { level: 1 })).toHaveCount(1)
  await expect(main.locator('.card')).toHaveCount(1)
  const field_style = () =>
    name.evaluate((el) => {
      const style = getComputedStyle(el)
      return {
        shadow: style.boxShadow,
        border: style.borderColor,
        background: style.backgroundColor,
        height: el.getBoundingClientRect().height,
      }
    })
  await page.mouse.move(0, 0)
  const idle = await field_style()
  expect(idle.height).toBe(48)
  const width = (await name.boundingBox())?.width ?? 0
  expect(width).toBeLessThanOrEqual(512)
  await name.focus()
  await expect.poll(async () => (await field_style()).border).not.toBe(idle.border)
  await expect.poll(async () => (await field_style()).shadow).not.toBe(idle.shadow)
  await name.fill('Новый блог')
  await expect(name).toHaveAccessibleDescription(/Осталось символов: 90/)
  await name.blur()
  await page.mouse.move(0, 0)
  await page.screenshot({
    path: info.outputPath('general-form.png'),
    fullPage: true,
    animations: 'disabled',
  })
  const result = await new AxeBuilder({ page }).include('main').analyze()
  expect(
    result.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical'),
  ).toEqual([])

  for (const screen of SCREENS.slice(1)) {
    // SPA navigation preserves the selected appearance, just as the header back link does.
    await page.getByRole('banner').getByRole('link', { name: 'Назад', exact: true }).click()
    await page.getByRole('main').locator(`a[href="/admin/settings/${screen}"]`).click()
    await expect(main.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(main.getByRole('button', { name: 'Сохранить', exact: true })).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    if (screen === 'seo') {
      const origin = main.getByRole('textbox', { name: 'Публичный адрес сайта', exact: true })
      await expect(origin).toHaveAttribute('readonly', '')
    }
    await page.screenshot({
      path: info.outputPath(`${screen}-form.png`),
      fullPage: true,
      animations: 'disabled',
    })
    const audit = await new AxeBuilder({ page }).include('main').analyze()
    expect(
      audit.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical'),
    ).toEqual([])
  }
})

test('ошибка реакции обозначает поле, связывает пояснение и сохраняет введённое значение', async ({
  page,
}) => {
  await page.addInitScript(() => localStorage.setItem('mock_viewer', 'superadmin'))
  await page.goto('/admin/settings/reactions')
  const emoji = page.getByRole('textbox', { name: 'Смех, Эмодзи', exact: true })
  await emoji.fill('текст')
  await page.getByRole('button', { name: 'Сохранить', exact: true }).click()
  await expect(emoji).toHaveAttribute('aria-invalid', 'true')
  await expect(emoji).toHaveAccessibleDescription(/Нужна одна графема-эмодзи/)
  await expect(emoji).toHaveValue('текст')
  await emoji.fill('😂')
  await expect(emoji).toHaveAttribute('aria-invalid', 'false')
})
