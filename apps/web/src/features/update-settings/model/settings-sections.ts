import { seoSettingsSchema } from '@blog/contracts'
import type { AdminSettingsRouteId } from '@/entities/admin'
import type { AdminSettings } from '../api/update-settings.ts'

export type SettingsSection = AdminSettingsRouteId

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
        logo_dark_url: draft.logo_dark_url,
        favicon: draft.favicon,
        locale: draft.locale,
      }
    case 'access':
      return {
        ...current,
        registration_open: draft.registration_open,
        new_members_can_publish: draft.new_members_can_publish,
      }
    case 'layout':
      return { ...current, shell: draft.shell }
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
