import { describe, expect, it } from 'vitest'
import {
  DEFAULT_THEME_SETTINGS,
  publicSettingsSchema,
  themeSettingsSchema,
  updateSettingsSchema,
} from '../src/http/settings.ts'

describe('theme settings', () => {
  it('fills defaults for an empty object and public settings without theme', () => {
    expect(themeSettingsSchema.parse({})).toEqual(DEFAULT_THEME_SETTINGS)
    const public_settings = publicSettingsSchema.parse({
      name: 'Blog',
      logo_url: null,
      locale: 'ru',
      reaction_appearances: [
        { kind: 'heart', label: 'Heart', status: 'active', presentation: 'emoji', emoji: '❤️' },
      ],
      profile_badges: [],
    })
    expect(public_settings.theme).toEqual(DEFAULT_THEME_SETTINGS)
  })

  it('rejects an invalid radius and accepts a full update theme', () => {
    expect(themeSettingsSchema.safeParse({ radius_card: 'round' }).success).toBe(false)
    expect(
      updateSettingsSchema.safeParse({
        name: 'Blog',
        logo_url: null,
        locale: 'ru',
        registration_open: true,
        new_members_can_publish: true,
        reaction_appearances: [
          { kind: 'heart', label: 'Heart', status: 'active', presentation: 'emoji', emoji: '❤️' },
        ],
        theme: {
          radius_card: '12px',
          header_overlay_hue: 180,
          header_overlay_opacity: 70,
          header_overlay_blur_px: 6,
        },
      }).success,
    ).toBe(true)
  })
})
