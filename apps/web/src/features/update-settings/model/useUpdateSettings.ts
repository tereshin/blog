import { useMutation, useQueryClient } from '@tanstack/react-query'
import { seoKeys } from '@/entities/seo'
import { settingsKeys, toPublicSettings } from '@/entities/settings'
import { getAdminSettings, updateSettings } from '../api/update-settings.ts'
import type { AdminSettings } from '../api/update-settings.ts'
import { mergeSettingsSection } from './settings-sections.ts'
import type { SettingsSection } from './settings-sections.ts'

export function useUpdateSettings() {
  const query_client = useQueryClient()
  return useMutation({
    mutationFn: async ({
      settings,
      section,
    }: {
      settings: AdminSettings
      section: SettingsSection
    }) => updateSettings(mergeSettingsSection(await getAdminSettings(), settings, section)),
    onSuccess: async (settings) => {
      query_client.setQueryData(settingsKeys.public(), toPublicSettings(settings))
      query_client.setQueryData(settingsKeys.admin(), settings)
      await query_client.invalidateQueries({ queryKey: settingsKeys.all })
      await query_client.invalidateQueries({ queryKey: seoKeys.all })
    },
  })
}
