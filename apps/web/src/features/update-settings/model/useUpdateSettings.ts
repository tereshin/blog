import { useMutation, useQueryClient } from '@tanstack/react-query'
import { settingsKeys, toPublicSettings } from '@/entities/settings'
import { updateSettings } from '../api/update-settings.ts'
import type { AdminSettings } from '../api/update-settings.ts'

export function useUpdateSettings() {
  const query_client = useQueryClient()
  return useMutation({
    mutationFn: (input: AdminSettings) => updateSettings(input),
    onSuccess: async (settings) => {
      query_client.setQueryData(settingsKeys.public(), toPublicSettings(settings))
      query_client.setQueryData(settingsKeys.admin(), settings)
      await query_client.invalidateQueries({ queryKey: settingsKeys.all })
    },
  })
}
