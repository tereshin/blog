import {
  adminSettingsSchema,
  seoSettingsSchema,
  DEFAULT_REACTION_APPEARANCES,
} from '@blog/contracts'
import { describe, expect, it } from 'vitest'
import { mergeSettingsSection } from '../../src/features/update-settings/model/settings-sections.ts'

const initial = adminSettingsSchema.parse({
  reaction_appearances: DEFAULT_REACTION_APPEARANCES,
  name: 'Blog',
  logo_url: null,
  locale: 'ru',
  about: '',
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
})
