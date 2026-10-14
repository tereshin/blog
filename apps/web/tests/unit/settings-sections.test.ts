import {
  adminSettingsSchema,
  seoSettingsSchema,
  DEFAULT_REACTION_APPEARANCES,
  DEFAULT_SHELL_VISIBILITY,
} from '@blog/contracts'
import { describe, expect, it } from 'vitest'
import { mergeSettingsSection } from '../../src/features/update-settings/model/settings-sections.ts'

const initial = adminSettingsSchema.parse({
  reaction_appearances: DEFAULT_REACTION_APPEARANCES,
  name: 'Blog',
  logo_url: null,
  locale: 'ru',
  registration_open: true,
  new_members_can_publish: true,
  profile_status_icons: [],
})

describe('saving settings categories', () => {
  it('keeps fresh server values from other categories', () => {
    const server = {
      ...initial,
      name: 'Renamed elsewhere',
      locale: 'en' as const,
      seo: seoSettingsSchema.parse({ title: 'Fresh SEO' }),
    }
    const draft = { ...initial, registration_open: false }
    expect(mergeSettingsSection(server, draft, 'access')).toEqual({
      ...server,
      registration_open: false,
    })
  })
  it('SEO saving preserves the current publisher', () => {
    const server = {
      ...initial,
      seo: seoSettingsSchema.parse({ publisher: { name: 'Fresh publisher' } }),
    }
    const draft = { ...initial, seo: seoSettingsSchema.parse({ title: 'New SEO' }) }
    const result = mergeSettingsSection(server, draft, 'seo')
    expect(result.seo?.title).toBe('New SEO')
    expect(result.seo?.publisher.name).toBe('Fresh publisher')
  })
  it('publisher saving preserves the current page metadata', () => {
    const server = {
      ...initial,
      seo: seoSettingsSchema.parse({ title: 'Fresh SEO', indexing_enabled: false }),
    }
    const draft = {
      ...initial,
      seo: seoSettingsSchema.parse({ publisher: { name: 'New publisher' } }),
    }
    const result = mergeSettingsSection(server, draft, 'publisher')
    expect(result.seo).toEqual({ ...server.seo, publisher: draft.seo.publisher })
  })
  it('layout saving replaces only shell visibility', () => {
    const server = { ...initial, name: 'Fresh name' }
    const shell = { ...DEFAULT_SHELL_VISIBILITY, popular: false, popular_comments: false }
    const result = mergeSettingsSection(server, { ...initial, shell }, 'layout')
    expect(result.name).toBe('Fresh name')
    expect(result.shell).toEqual(shell)
    expect(result.registration_open).toBe(server.registration_open)
  })
  it('saving badges keeps fresh server values in all other categories', () => {
    const server = { ...initial, name: 'Fresh name', profile_status_icons: [{ id: '11111111-1111-4111-8111-111111111111', label: 'Status', image_url: 'http://media.test/status.png' }] }
    const draft = { ...initial, profile_badges: initial.profile_badges.map((badge) => ({ ...badge, label: 'Changed' })) }
    expect(mergeSettingsSection(server, draft, 'badges')).toEqual({ ...server, profile_badges: draft.profile_badges })
  })

})
