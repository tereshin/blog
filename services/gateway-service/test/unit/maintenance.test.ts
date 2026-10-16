import { describe, expect, it } from 'vitest'
import { MaintenanceService } from '../../src/modules/maintenance/index.ts'

const TEMPLATE =
  '<!doctype html><html><head><title>Blog</title><script type="module" src="/assets/app.js"></script></head><body><div id="root"></div></body></html>'

describe('maintenance HTML', () => {
  it('keeps the application bootstrap for sign-in and only renders the maintenance message', async () => {
    const service = new MaintenanceService(
      {
        status: async () => ({ maintenance_enabled: true, locale: 'ru' }),
        template: async () => TEMPLATE,
      },
      'https://blog.test',
    )
    const html = await service.page('ru', 'nonce-value')
    expect(html).toContain('Технические работы')
    expect(html).toContain('src="/assets/app.js"')
    expect(html).toContain('nonce="nonce-value"')
    expect(html).toContain('content="noindex, follow"')
    expect(html).not.toContain('<title>Blog</title>')
  })

  it('does not treat an unavailable settings owner as maintenance being disabled', async () => {
    const error = new Error('content unavailable')
    const service = new MaintenanceService(
      {
        status: async () => {
          throw error
        },
        template: async () => null,
      },
      'https://blog.test',
    )
    await expect(service.status('viewer-jwt')).rejects.toBe(error)
  })
})
