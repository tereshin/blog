import { useQuery } from '@tanstack/react-query'
import { getSettings } from '../api/get-settings.ts'
import { settingsKeys } from './settings-keys.ts'

/** Настройки площадки редко меняются: держим дольше обычного. */
export function useSettings() {
  return useQuery({
    queryKey: settingsKeys.public(),
    queryFn: ({ signal }) => getSettings(signal),
    staleTime: 5 * 60_000,
  })
}
