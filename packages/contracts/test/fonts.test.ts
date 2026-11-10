import { describe, expect, it } from 'vitest'
import { GOOGLE_FONTS, findGoogleFont, googleFontStylesheet } from '../src/fonts/index.ts'
import { updateSettingsSchema } from '../src/http/settings.ts'

describe('Google Fonts catalog', () => {
  it('contains distinct selectable families compatible with the settings contract', () => {
    expect(GOOGLE_FONTS.length).toBeGreaterThan(1000)
    expect(new Set(GOOGLE_FONTS.map((font) => font.family)).size).toBe(GOOGLE_FONTS.length)
    const schema = updateSettingsSchema.shape.font_family
    for (const font of GOOGLE_FONTS) expect(schema.safeParse(font.family).success).toBe(true)
  })
  it('uses local Inter and never creates a URL for unknown families', () => {
    expect(googleFontStylesheet('Inter')).toBeNull()
    expect(googleFontStylesheet('unknown')).toBeNull()
  })
  it('requests only supported weights and italic styles through the CSS2 API', () => {
    const url = new URL(googleFontStylesheet('Roboto') ?? '')
    expect(url.origin).toBe('https://fonts.googleapis.com')
    expect(url.searchParams.get('family')).toBe(
      'Roboto:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,600;1,700',
    )
    expect(url.searchParams.get('display')).toBe('swap')
    expect(googleFontStylesheet('Abel')).toContain('family=Abel%3Awght%40400')
    expect(findGoogleFont('Roboto')?.cyrillic).toBe(true)
  })
})
