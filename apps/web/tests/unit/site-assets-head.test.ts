import { afterEach, describe, expect, it } from 'vitest'
import { faviconSettingsSchema } from '@blog/contracts'
import { applySiteAssetsHead } from '../../src/widgets/page-seo/model/site-assets-head.ts'
import { clearPageHead } from '../../src/widgets/page-seo/model/page-head.ts'
afterEach(() => {
  document.head.innerHTML = ''
})
describe('site asset metadata ownership', () => {
  it('preserves icons across SEO updates and replaces or removes them without duplicates', () => {
    applySiteAssetsHead(
      faviconSettingsSchema.parse({
        png: 'https://files.test/icon-one',
        manifest: 'https://files.test/manifest',
      }),
    )
    expect(document.head.querySelectorAll('[data-site-asset]')).toHaveLength(2)
    expect(document.head.querySelector('[sizes="96x96"]')?.getAttribute('href')).toBe(
      '/favicon-96x96.png?v=icon-one',
    )
    clearPageHead('Blog')
    expect(document.head.querySelectorAll('[data-site-asset]')).toHaveLength(2)
    applySiteAssetsHead(faviconSettingsSchema.parse({ png: 'https://files.test/icon-two' }))
    expect(document.head.querySelectorAll('[data-site-asset]')).toHaveLength(1)
    expect(document.head.querySelector('[data-site-asset]')?.getAttribute('href')).toContain(
      'v=icon-two',
    )
    applySiteAssetsHead(faviconSettingsSchema.parse({}))
    expect(document.head.querySelectorAll('[data-site-asset]')).toHaveLength(0)
  })
})
