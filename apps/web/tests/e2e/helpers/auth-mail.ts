import { expect } from '@playwright/test'
import type { Page } from '@playwright/test'

export async function readEmailCode(page: Page, email: string): Promise<string> {
  const mailpit = process.env['MAILPIT_URL'] ?? 'http://localhost:8025'
  let code = ''
  await expect.poll(async () => {
    const response = await page.request.get(`${mailpit}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`)
    const list = (await response.json()) as { messages: { ID: string }[] }
    const id = list.messages[0]?.ID
    if (!id) return false
    const message = await page.request.get(`${mailpit}/api/v1/message/${id}`)
    const body = (await message.json()) as { Text: string }
    code = body.Text.match(/\b\d{6}\b/)?.[0] ?? ''
    return Boolean(code)
  }, { timeout: 20_000 }).toBe(true)
  return code
}
