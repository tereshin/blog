import { expect, test } from '@playwright/test'

for (const path of ['/', '/p/statya-1']) {
  for (const [action, api_path, label] of [
    ['закладка', '/v1/bookmarks/', /^(В закладки|Убрать из закладок)$/],
    ['подписка', '/v1/follows', /^(Подписаться|Вы подписаны)$/],
  ] as const) {
    test(`${action} блокируется без прозрачности: ${path}`, async ({ page }) => {
      test.skip(process.env['E2E_TARGET'] === 'local', 'использует фикстурную статью')
      await page.addInitScript(({ api_path }) => {
        localStorage.setItem('mock_viewer', 'member')
        const original_fetch = window.fetch.bind(window)
        window.fetch = async (input, init) => {
          const request = new Request(input, init)
          const is_action = new URL(request.url).pathname.startsWith(api_path)
            && ['PUT', 'DELETE'].includes(request.method)
          // Register before sending so a fast assertion cannot release a later response.
          const gate = is_action ? new Promise<void>((resolve) =>
            window.addEventListener('release-action-response', () => resolve(), { once: true }),
          ) : undefined
          const response = await original_fetch(input, init)
          await gate
          return response
        }
      }, { api_path })
      await page.goto(path)
      const article = page.getByRole('main').getByRole('article').first()
      const button = article.getByRole('button', { name: label })
      await expect(button).toBeEnabled()
      await expect(button).toHaveAttribute('aria-pressed', 'false')

      // Both adding and removing the action must preserve opacity and block repeats.
      for (const is_active of [true, false]) {
        await button.click()
        await expect(button).toBeDisabled()
        await expect(button).toHaveCSS('opacity', '1')
        await page.evaluate(() => window.dispatchEvent(new Event('release-action-response')))
        await expect(button).toBeEnabled()
        await expect(button).toHaveAttribute('aria-pressed', String(is_active))
      }
    })
  }
}
