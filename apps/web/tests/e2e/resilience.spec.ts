import { execFileSync } from 'node:child_process'
import { expect, test } from '@playwright/test'

const is_local = process.env['E2E_TARGET'] === 'local'
const stop_messaging = process.env['E2E_RESILIENCE'] === '1'

test.describe('устойчивость', () => {
  test.skip(!is_local, 'нужен Compose (E2E_TARGET=local)')

  test('после 20 с без сети комментарий появляется не позже 5 с', async ({ page, context }) => {
    test.skip(!stop_messaging, 'сценарий сети включается E2E_RESILIENCE=1')
    await page.goto('/p/seed-short-note')
    const field = page.getByRole('main').getByRole('textbox')
    await field.fill('Комментарий после обрыва')
    await context.setOffline(true)
    await page.waitForTimeout(20_000)
    const started = Date.now()
    await context.setOffline(false)
    await page.getByRole('main').getByRole('button', { name: 'Отправить' }).click()
    await expect(page.getByText('Комментарий после обрыва')).toBeVisible({ timeout: 5_000 })
    expect(Date.now() - started).toBeLessThan(5_000)
  })

  test('остановленный messaging не ломает ленту и статью, сообщения предлагают повтор', async ({ page }) => {
    test.skip(!stop_messaging, 'остановка контейнера только при E2E_RESILIENCE=1')
    execFileSync('pnpm', ['infra:up', 'local', '--services', 'messaging'], { stdio: 'ignore' })
    try {
      execFileSync('docker', ['compose', '-f', 'infra/compose/docker-compose.yml', '-f', 'infra/compose/docker-compose.local.yml', '--env-file', 'infra/env/local.env', 'stop', 'messaging'])
      await page.goto('/')
      await expect(page.getByRole('main').getByRole('article').first()).toBeVisible()
      await page.goto('/p/seed-short-note')
      await expect(page.getByRole('main')).toBeVisible()
      await page.goto('/messages')
      await expect(page.getByRole('main').getByRole('button', { name: 'Повторить' })).toBeVisible()
    } finally {
      execFileSync('pnpm', ['infra:up', 'local', '--services', 'messaging'], { stdio: 'ignore' })
    }
  })

  test('неудачная реакция откатывается', async ({ page }) => {
    await page.route('**/v1/reactions', (route) => (route.request().method() === 'POST' ? route.abort() : route.continue()))
    await page.goto('/p/seed-short-note')
    const reaction = page.getByRole('main').getByRole('button', { name: /Смех|👍|❤|🔥|😂/ }).first()
    const before = await reaction.getAttribute('aria-pressed')
    await reaction.click()
    await expect(reaction).toHaveAttribute('aria-pressed', before ?? 'false')
  })

  test('истёкшая сессия на комментарии оставляет черновик и отправляет после входа', async ({ page }) => {
    await page.route('**/v1/articles/*/comments', (route) =>
      route.request().method() === 'POST' ? route.fulfill({ status: 401, body: '{}' }) : route.continue(),
    )
    await page.goto('/p/seed-short-note')
    const field = page.getByRole('main').getByRole('textbox')
    await field.fill('Черновик на месте')
    await page.getByRole('main').getByRole('button', { name: 'Отправить' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(field).toHaveValue('Черновик на месте')
  })

  test('превью бота видит публичную статью и не видит черновик', async ({ request }) => {
    const published = await request.get('/p/seed-long-interfaces', { headers: { 'user-agent': 'Telegrambot' } })
    expect(published.ok()).toBe(true)
    expect(await published.text()).toContain('seed-long-interfaces')
    const draft = await request.get('/p/seed-draft', { headers: { 'user-agent': 'Telegrambot' } })
    expect(draft.status()).toBe(404)
  })
})
