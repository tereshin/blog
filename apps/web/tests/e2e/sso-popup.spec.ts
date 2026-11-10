import { expect, test } from '@playwright/test'

// The Firebase popup uses a real SDK and Auth Emulator; only our session endpoint is MSW.
// Start the emulator on 127.0.0.1:9099, then set SSO_EMULATOR_TESTS=1.
test.skip(process.env['SSO_EMULATOR_TESTS'] !== '1', 'requires Firebase Auth Emulator')
for (const provider of ['Google', 'GitHub']) {
  test(`${provider} opens on the first click, exchanges an ID token and leaves no stored credentials`, async ({
    page,
  }) => {
    await page.goto('/')
    await page.getByRole('banner').getByRole('button', { name: 'Войти', exact: true }).click()
    const button = page.getByRole('button', { name: `Войти через ${provider}`, exact: true })
    await expect(button).toBeEnabled()
    const popup_event = page.waitForEvent('popup')
    await button.click()
    const popup = await popup_event
    await popup.waitForLoadState('load')
    await popup.getByText('Add new account').click()
    await popup
      .locator('#email-input')
      .fill(`sso-${Date.now()}-${provider.toLowerCase()}@example.test`)
    await popup.locator('#display-name-input').fill('SSO Test')
    const session_request = page.waitForRequest(
      (request) => request.method() === 'POST' && request.url().endsWith('/v1/auth/sessions'),
    )
    await popup.getByRole('button', { name: /Sign in/i }).click()
    const credentials = (await session_request).postDataJSON()
    expect(credentials.method).toBe('id_token')
    expect(typeof credentials.id_token).toBe('string')
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(
      page.getByRole('banner').getByRole('button', { name: 'Меню учётной записи' }),
    ).toBeVisible()
    await expect(page).toHaveURL('/')
    const stored_auth_keys = await page.evaluate(() =>
      [...Object.keys(localStorage), ...Object.keys(sessionStorage)].filter((key) =>
        key.startsWith('firebase:'),
      ),
    )
    expect(stored_auth_keys).toEqual([])
  })
}
