import { seoSettingsSchema } from '@blog/contracts'
import type { MessageKey } from '@/shared/i18n'
import type { AdminSettings } from '../api/update-settings.ts'

export type SettingsSection =
  'general' | 'access' | 'reactions' | 'status-icons' | 'seo' | 'publisher' | 'covers'
export const SETTINGS_SECTIONS: Record<
  SettingsSection,
  { title: MessageKey; description: MessageKey }
> = {
  general: { title: 'admin.settings.general', description: 'admin.settings.general_hint' },
  access: { title: 'admin.settings.access', description: 'admin.settings.access_hint' },
  reactions: { title: 'admin.settings.reactions', description: 'admin.settings.reactions_hint' },
  'status-icons': {
    title: 'admin.settings.status_icons',
    description: 'admin.settings.status_icons_hint',
  },
  seo: { title: 'seo.settings', description: 'admin.settings.seo_hint' },
  publisher: { title: 'seo.publisher', description: 'seo.publisher_hint' },
  covers: { title: 'seo.covers', description: 'seo.covers_hint' },
}

/** The API accepts a full document. Merge only the current category into fresh server settings. */
export function mergeSettingsSection(
  current: AdminSettings,
  draft: AdminSettings,
  section: SettingsSection,
): AdminSettings {
  const current_seo = seoSettingsSchema.parse(current.seo ?? {})
  const draft_seo = seoSettingsSchema.parse(draft.seo ?? {})
  switch (section) {
    case 'general':
      return {
        ...current,
        name: draft.name,
        logo_url: draft.logo_url,
        locale: draft.locale,
        about: draft.about,
      }
    case 'access':
      return {
        ...current,
        registration_open: draft.registration_open,
        new_members_can_publish: draft.new_members_can_publish,
      }
    case 'reactions':
      return { ...current, reaction_appearances: draft.reaction_appearances }
    case 'status-icons':
      return { ...current, profile_status_icons: draft.profile_status_icons }
    case 'seo':
      return { ...current, seo: { ...draft_seo, publisher: current_seo.publisher } }
    case 'publisher':
      return { ...current, seo: { ...current_seo, publisher: draft_seo.publisher } }
    case 'covers':
      return { ...current, social_cover: draft.social_cover }
  }
}
