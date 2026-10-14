import { useQuery } from '@tanstack/react-query'
import { settingsKeys } from '@/entities/settings'
import { getAdminSettings } from '@/features/update-settings'

export function useAdminSettings() {
  return useQuery({
    queryKey: settingsKeys.admin(),
    queryFn: ({ signal }) => getAdminSettings(signal),
  })
}
